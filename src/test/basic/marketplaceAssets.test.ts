import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('Marketplace assets', () => {
  const root = path.resolve(__dirname, '..', '..', '..');
  const manifest: { icon: string } = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  );

  it('should keep the configured icon within the Marketplace 1024 KB limit', () => {
    const icon = fs.readFileSync(path.join(root, manifest.icon));

    expect(icon.length).to.be.greaterThan(0);
    expect(icon.length).to.be.at.most(1024 * 1024);
  });

  it('should use a square PNG icon of at least 128 pixels', () => {
    const icon = fs.readFileSync(path.join(root, manifest.icon));

    expect(icon.subarray(0, 8).toString('hex')).to.equal('89504e470d0a1a0a');
    expect(icon.toString('ascii', 12, 16)).to.equal('IHDR');
    const width = icon.readUInt32BE(16);
    const height = icon.readUInt32BE(20);

    expect(width).to.be.at.least(128);
    expect(height).to.equal(width);
  });
});
