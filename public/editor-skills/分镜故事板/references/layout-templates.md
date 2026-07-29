# Layout Templates - 排版模板参考

## Film Strip Layout (电影级)

**特点**: 黑底单栏，电影工业标准
**适用**: 影视制作、TVC广告、导演分镜

```html
<!DOCTYPE html>
<html>
<head>
<style>
body { background: #000; font-family: Arial, sans-serif; }
.storyboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}
.panel {
  margin-bottom: 40px;
  page-break-inside: avoid;
}
.panel-image {
  width: 100%;
  max-width: 900px;
  border: 1px solid #333;
}
.metadata {
  color: #888;
  font-size: 12px;
  margin: 10px 0;
  font-family: monospace;
}
.caption {
  color: #ccc;
  font-size: 14px;
  margin-top: 8px;
}
.dialogue {
  color: #ffcc00;
  font-style: italic;
  margin-top: 5px;
}
</style>
</head>
<body>
<div class="storyboard">
  <!-- Panel Template -->
  <div class="panel">
    <img class="panel-image" src="panel-01.jpg" alt="Shot 1" />
    <div class="metadata">SHOT: WS | CAM: Static | DUR: 4s | LENS: 24mm</div>
    <div class="caption">Wide establishing shot of the city at dawn</div>
    <div class="dialogue">(V.O.) "Every great story begins with a single moment..."</div>
  </div>
</div>
</body>
</html>
```

## Comic Grid Layout (漫画级)

**特点**: 白底网格，编号标签，厚边框
**适用**: 叙事内容、漫画分镜、教育材料

```html
<!DOCTYPE html>
<html>
<head>
<style>
body { background: #fff; font-family: sans-serif; }
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 20px;
}
.panel {
  border: 3px solid #333;
  padding: 10px;
  position: relative;
}
.badge {
  position: absolute;
  top: -12px;
  left: 10px;
  background: #333;
  color: #fff;
  padding: 2px 10px;
  font-weight: bold;
  font-size: 14px;
}
.panel-image {
  width: 100%;
}
.caption {
  margin-top: 10px;
  font-size: 13px;
  color: #333;
  min-height: 40px;
}
</style>
</head>
<body>
<div class="grid">
  <div class="panel">
    <span class="badge">01</span>
    <img class="panel-image" src="panel-01.jpg" />
    <div class="caption">Opening scene establishes location</div>
  </div>
</div>
</body>
</html>
```

## Presentation Deck Layout (提案级)

**特点**: 大图小注，专业简洁
**适用**: 客户提案、团队演示、投资人展示

```html
<!DOCTYPE html>
<html>
<head>
<style>
body { background: #f5f5f5; font-family: 'Helvetica Neue', sans-serif; }
.deck { max-width: 1400px; margin: 0 auto; }
.slide {
  display: flex;
  background: #fff;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.slide-image {
  width: 65%;
  object-fit: cover;
}
.slide-info {
  width: 35%;
  padding: 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.slide-number {
  color: #999;
  font-size: 48px;
  font-weight: 300;
}
.slide-title {
  font-size: 24px;
  font-weight: 600;
  margin: 10px 0;
}
.slide-desc {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}
</style>
</head>
<body>
<div class="deck">
  <div class="slide">
    <img class="slide-image" src="scene-01.jpg" />
    <div class="slide-info">
      <div class="slide-number">01</div>
      <div class="slide-title">The Discovery</div>
      <div class="slide-desc">Main character finds the mysterious artifact in grandmother's attic</div>
    </div>
  </div>
</div>
</body>
</html>
```

## Social Media Layout (社交媒体级)

**特点**: 竖版适配，移动优先
**适用**: 短视频、Instagram Stories、TikTok

```html
<!DOCTYPE html>
<html>
<head>
<style>
body { background: #000; }
.storyboard {
  max-width: 400px;
  margin: 0 auto;
}
.panel {
  margin-bottom: 20px;
}
.panel img {
  width: 100%;
  aspect-ratio: 9/16;
  object-fit: cover;
}
.info {
  background: rgba(255,255,255,0.9);
  padding: 15px;
  text-align: center;
}
.info h4 { margin: 0 0 5px; font-size: 14px; }
.info p { margin: 0; font-size: 12px; color: #666; }
</style>
</head>
<body>
<div class="storyboard">
  <div class="panel">
    <img src="vertical-01.jpg" />
    <div class="info">
      <h4>Scene 1</h4>
      <p>Hook - grab attention in first 3 seconds</p>
    </div>
  </div>
</div>
</body>
</html>
```
