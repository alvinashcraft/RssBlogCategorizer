import { expect } from 'chai';
import { isAlvinAshcraftHost } from '../../utils/http';

describe('isAlvinAshcraftHost', () => {
    it('matches alvinashcraft.com exactly', () => {
        expect(isAlvinAshcraftHost('https://alvinashcraft.com')).to.be.true;
    });

    it('matches www.alvinashcraft.com (subdomain)', () => {
        expect(isAlvinAshcraftHost('https://www.alvinashcraft.com')).to.be.true;
    });

    it('matches with trailing path/query', () => {
        expect(isAlvinAshcraftHost('https://www.alvinashcraft.com/2026/05/29/dew-drop-4679?utm=foo')).to.be.true;
    });

    it('tolerates bare hostname without scheme', () => {
        expect(isAlvinAshcraftHost('alvinashcraft.com')).to.be.true;
    });

    it('is case-insensitive on the hostname', () => {
        expect(isAlvinAshcraftHost('https://AlvinAshcraft.com')).to.be.true;
    });

    it('rejects substring impostors (notalvinashcraft.com)', () => {
        expect(isAlvinAshcraftHost('https://notalvinashcraft.com')).to.be.false;
    });

    it('rejects look-alike subdomain on a different parent (alvinashcraft.com.evil.com)', () => {
        expect(isAlvinAshcraftHost('https://alvinashcraft.com.evil.com')).to.be.false;
    });

    it('rejects unrelated domains', () => {
        expect(isAlvinAshcraftHost('https://example.com')).to.be.false;
    });

    it('rejects empty / missing values', () => {
        expect(isAlvinAshcraftHost('')).to.be.false;
        expect(isAlvinAshcraftHost(undefined)).to.be.false;
        expect(isAlvinAshcraftHost(null)).to.be.false;
        expect(isAlvinAshcraftHost('   ')).to.be.false;
    });

    it('rejects unparseable garbage', () => {
        expect(isAlvinAshcraftHost('not a url at all 😀')).to.be.false;
    });
});
