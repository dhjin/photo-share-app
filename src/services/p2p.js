/**
 * P2P Service — WebRTC peer connection management via Socket.io signaling
 *
 * Flow:
 * 1. Downloader calls requestPhoto(photoId, nodes)
 * 2. Server relays to an online node via p2p:incoming
 * 3. Node creates RTCPeerConnection, sends offer
 * 4. Downloader receives offer, sends answer
 * 5. ICE candidates exchanged
 * 6. DataChannel opens → photo bytes transferred
 * 7. Downloader registers as new cache node after successful transfer
 */

import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import { configApi, nodeApi, photoApi } from './api';

const SIGNALING_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const CHUNK_SIZE = 16384; // 16 KB

let socket = null;
let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

async function connect(userId) {
  if (socket?.connected) return socket;

  try {
    const res = await configApi.ice();
    iceServers = res.data.iceServers;
  } catch {}

  socket = io(SIGNALING_URL, { auth: { userId }, transports: ['websocket'] });

  socket.on('connect', () => console.log('[P2P] Signaling connected'));
  socket.on('disconnect', () => console.log('[P2P] Signaling disconnected'));

  return socket;
}

function disconnect() {
  socket?.disconnect();
  socket = null;
}

/**
 * Serve as a node: listen for incoming P2P requests and send the file
 * @param {string} photoLocalPath - local path of the original photo file
 */
function listenAsNode(photoId, photoLocalPath) {
  if (!socket) return;

  socket.on('p2p:incoming', async ({ photoId: pid, fromSocketId }) => {
    if (pid !== photoId) return;

    const pc = new RTCPeerConnection({ iceServers });
    const channel = pc.createDataChannel('photo');

    channel.onopen = async () => {
      try {
        const { readAsArrayBuffer } = await import('expo-file-system').catch(() => ({}));
        // In production, read file and send in chunks
        // Here we emit a ready signal
        channel.send(JSON.stringify({ type: 'ready', photoId }));
      } catch (e) {
        console.error('[P2P] File read error', e);
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('p2p:ice-candidate', { toSocketId: fromSocketId, candidate });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('p2p:offer', { toSocketId: fromSocketId, photoId, offer });

    socket.on('p2p:answer', async ({ fromSocketId: src, answer }) => {
      if (src !== fromSocketId) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('p2p:ice-candidate', async ({ fromSocketId: src, candidate }) => {
      if (src !== fromSocketId) return;
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  });
}

/**
 * Download a photo from P2P peers
 * Returns a Promise that resolves with the received data (base64 or ArrayBuffer)
 */
function requestPhoto(photoId, nodes) {
  return new Promise(async (resolve, reject) => {
    if (!socket || nodes.length === 0) {
      return reject(new Error('No peers available'));
    }

    const timeout = setTimeout(() => reject(new Error('P2P timeout')), 30000);

    // Try nodes in order
    let tried = 0;
    const tryNext = () => {
      if (tried >= nodes.length) {
        clearTimeout(timeout);
        return reject(new Error('All peers offline'));
      }
      const peer = nodes[tried++];
      socket.emit('p2p:request', { photoId, targetUserId: peer.user_id });
    };

    socket.on('p2p:peer-offline', ({ photoId: pid }) => {
      if (pid === photoId) tryNext();
    });

    socket.on('p2p:offer', async ({ photoId: pid, fromSocketId, offer }) => {
      if (pid !== photoId) return;

      const pc = new RTCPeerConnection({ iceServers });
      const chunks = [];

      pc.ondatachannel = (e) => {
        const channel = e.channel;
        channel.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data.type === 'ready') {
              // Signal we're ready (in production, receive binary chunks)
            }
          } catch {
            chunks.push(msg.data);
          }
          if (msg.data === '__END__') {
            clearTimeout(timeout);
            const result = chunks.join('');
            resolve(result);
            // Register as new node
            nodeApi.register(photoId).catch(() => {});
            photoApi.registerDownload(photoId).catch(() => {});
          }
        };
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('p2p:ice-candidate', { toSocketId: fromSocketId, candidate });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('p2p:answer', { toSocketId: fromSocketId, photoId, answer });

      socket.on('p2p:ice-candidate', async ({ fromSocketId: src, candidate }) => {
        if (src !== fromSocketId) return;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });
    });

    tryNext();
  });
}

export default { connect, disconnect, listenAsNode, requestPhoto };
