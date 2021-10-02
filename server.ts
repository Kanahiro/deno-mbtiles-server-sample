import { listenAndServe } from 'https://deno.land/std@0.109.0/http/server.ts';
import { DB } from 'https://deno.land/x/sqlite@v3.1.1/mod.ts';
import { expandGlob } from 'https://deno.land/std@0.109.0/fs/expand_glob.ts';
import { gunzip } from 'https://deno.land/x/compress@v0.4.1/mod.ts';

// make connections to .MBTiles files in './tiles'
const connections: { [key: string]: DB } = {};
for await (const mbtiles of expandGlob('tiles/*.mbtiles')) {
    connections[mbtiles.name.split('.')[0]] = new DB(mbtiles.path);
}

listenAndServe(':8000', (request) => {
    const [tilename, z, x, y] = request.url.split('/').slice(-4);
    const fy = Math.pow(2, Number(z)) - Number(y.split('.')[0]) - 1;

    if (typeof connections[tilename] === 'undefined') {
        return new Response('mbtiles is not exist', { status: 404 });
    }

    const pbf = connections[tilename].query(
        `select tile_data from tiles where zoom_level=${z} and tile_column=${x} and tile_row=${fy};`,
    );
    if (pbf.length === 0) {
        return new Response('tile is not exist', { status: 404 });
    }

    return new Response(gunzip(pbf[0][0] as Uint8Array));
});
