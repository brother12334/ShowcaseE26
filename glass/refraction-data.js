/* Decode and unpack one refraction atlas without holding up the tab. */
function unpackPlane(data, start, width, height) {
  const pixels = width * height, size = pixels * 4;
  const lo = new Uint8Array(data, start, size);
  const hi = new Uint8Array(data, start + size, size);
  const output = new Uint16Array(size);
  // Reassemble the planar, row-delta-coded half-float channels for WebGL.
  for (let channel = 0; channel < 4; channel++) {
    const base = channel * pixels;
    for (let row = 0; row < height; row++) {
      let value = 0;
      const rowStart = row * width;
      for (let x = rowStart; x < rowStart + width; x++) {
        value += lo[base + x] | (hi[base + x] << 8);
        output[x * 4 + channel] = value;
      }
    }
  }
  return output;
}

async function loadRays(url) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error('Refraction map unavailable');
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  const data = await new Response(stream).arrayBuffer();
  const header = new DataView(data);
  if (data.byteLength < 12 || header.getUint32(0) !== 0x45323650) {
    throw new Error('Unsupported refraction map');
  }
  const [width, height, frames, columns] = [4, 6, 8, 10].map(i => header.getUint16(i, true));
  const atlasWidth = width * columns, atlasHeight = height * Math.ceil(frames / columns);
  const size = atlasWidth * atlasHeight * 4;
  if (!width || !height || !frames || !columns || data.byteLength !== 12 + 4 * size) {
    throw new Error('Invalid refraction map');
  }
  return { width, height, frames, columns, atlasWidth, atlasHeight,
    planes: [unpackPlane(data, 12, atlasWidth, atlasHeight),
      unpackPlane(data, 12 + 2 * size, atlasWidth, atlasHeight)] };
}

self.onmessage = async event => {
  try {
    const rays = await loadRays(event.data);
    self.postMessage(rays, rays.planes.map(plane => plane.buffer));
  } catch (error) {
    self.postMessage(null);
  }
};
