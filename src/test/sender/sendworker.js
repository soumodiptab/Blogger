const workerpool = require('workerpool');
const fs = require('fs');
const CHUNK_SIZE = 1024 * 1024; // 1MB
const PART_SIZE = 256 * CHUNK_SIZE;
async function sendChunkedData(socket,partIndex,filepath) {
    socket.on('start', ({ partIndex }) => {
        console.log('Starting to send part '+partIndex);
        const part_start = partIndex * PART_SIZE;
        const part_end = Math.min(start + PART_SIZE, fileSize);
        const fileBuffer = fs.readFileSync(filepath);
        const numChunks = Math.ceil((part_end - part_start) / CHUNK_SIZE);
        let chunkIndex = 0;
        const sendChunk = () => {
            const start = part_start + chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, part_end);
            const chunk = fileBuffer.slice(start, end);
            socket.emit('chunk', { index: i, data: chunk });
            chunkIndex++;
            if (chunkIndex < numChunks) {
                setTimeout(sendChunk, 10);
            }
            else {
                console.log('All chunks sent');
            }
        };
        sendChunk();
    });
    socket.on('end', () => {
        console.log('All chunks received by reciever for part '+partIndex);
        socket.emit('end');
    });
  };
  workerpool.worker({
    recieveChunkedData: recieveChunkedData});