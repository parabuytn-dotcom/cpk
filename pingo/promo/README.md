# Pub Pingo (vidéo verticale 15 s)

- `pingo-pub.mp4` : 1080×1920, 30 i/s, H.264 + AAC, 15 s — pour TikTok, Reels, Shorts, statuts.
- `pingo-pub-cover.jpg` : image de couverture.

Tout est original : le pingouin, l'animation (HTML), la musique (synthétisée par `music.py`),
et les captures de l'app (données de démonstration, prénoms fictifs).

## Régénérer

```bash
cd pingo && npm run build && npx vite preview --port 4183 &   # l'app, pour les captures
cd promo/src
node shots.cjs http://localhost:4183      # captures → app-*.png (puis convertir en .jpg ou adapter ad.html)
node frames.cjs                            # 450 images → frames/
python3 music.py music.wav                 # musique + bruitages
ffmpeg -framerate 30 -i frames/f%04d.jpg -i music.wav -c:v libx264 -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart ../pingo-pub.mp4
```
