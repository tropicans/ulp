const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
    try {
        const playlists = await prisma.ytPlaylist.count();
        const playlistItems = await prisma.ytPlaylistItem.count();
        const sessions = await prisma.ytCurationSession.count();
        const candidates = await prisma.ytCurationCandidate.count();

        console.log(`Data Summary:`);
        console.log(`- yt_playlists: ${playlists}`);
        console.log(`- yt_playlist_items: ${playlistItems}`);
        console.log(`- yt_curation_sessions: ${sessions}`);
        console.log(`- yt_curation_candidates: ${candidates}`);

        if (sessions > 0) {
            const lastSession = await prisma.ytCurationSession.findFirst({
                orderBy: { createdAt: 'desc' },
                include: { candidates: true }
            });
            console.log(`\nLast Session: ${lastSession.topic} (${lastSession.status})`);
            console.log(`Candidates: ${lastSession.candidates.length}`);
        }

        if (playlists > 0) {
            const lastPlaylist = await prisma.ytPlaylist.findFirst({
                orderBy: { createdAt: 'desc' }
            });
            console.log(`\nLast Playlist: ${lastPlaylist.playlistTitle} (${lastPlaylist.status})`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
