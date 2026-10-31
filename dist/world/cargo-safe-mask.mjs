// Already-eroded selected support only. No dilation or second erosion.
export function packCargoSafeRedToBits(data){if(!(data instanceof Uint8Array||data instanceof Uint8ClampedArray)||data.length%4)throw Error('SAFE_MASK_RGBA_REQUIRED');const bits=new Uint8Array(Math.ceil(data.length/32));for(let i=0;i<data.length/4;i++)if(data[i*4]===255)bits[i>>>3]|=1<<(i&7);return bits}
