
export const code = `await loadScript("http://localhost:3000/hydra-pitschpatsch.js")

osc(60, 0.1, 0.8).out()
osc(30).out()
osc(() => Math.sin(time) * 100).out()

noise(10, 0.1).out()
noise(3).out()
noise(() => Math.sin(time) * 10).out()

shape(4, 0.3, 0.01).out()
shape(3).out()
shape(100, 0.5, 0.001).out()

gradient(0.1).out()
gradient().out()
gradient(() => Math.sin(time)).out()

solid(1, 0, 0, 1).out()
solid(1).out()
solid(1, 1, 1).out()

voronoi(5, 0.3, 0.3).out()
voronoi().out()
voronoi(10, 0.5).out()

brightness(0.4).out()
brightness().out()
brightness(() => Math.sin(time)).out()

contrast(1.6).out()
contrast().out()
contrast(() => Math.sin(time) * 5).out()

color(1, 0.5, 0.3, 1).out()
color(1).out()
color(1, 1).out()
color(1, 1, 1).out()

colorama(0.005).out()
colorama().out()
colorama(() => Math.sin(time) * 0.1).out()

invert(1).out()
invert().out()
invert(() => Math.sin(time)).out()

luma(0.5, 0.1).out()
luma().out()
luma(0.7).out()

posterize(3, 0.6).out()
posterize().out()
posterize(() => Math.sin(time) * 5 + 6).out()

saturate(2).out()
saturate().out()
saturate(() => Math.sin(time) * 10).out()

shift(0.5, 0, 0, 0).out()
shift().out()
shift(0.5).out()
shift(0.5, 0.1).out()
shift(0.5, 0.1, 0.2).out()

thresh(0.5, 0.04).out()
thresh().out()
thresh(() => Math.sin(time) * 0.5 + 0.5).out()

kaleid(4).out()
kaleid().out()
kaleid(() => Math.sin(time) * 10).out()

pixelate(20, 20).out()
pixelate().out()
pixelate(() => Math.sin(time) * 50).out()

repeat(3, 3, 0, 0).out()
repeat().out()
repeat(3).out()
repeat(3, 3).out()
repeat(3, 3, 0.5).out()

repeatX(3, 0).out()
repeatX().out()
repeatX(() => Math.sin(time) * 5).out()

repeatY(3, 0).out()
repeatY().out()
repeatY(() => Math.sin(time) * 5).out()

rotate(1.57, 0).out()
rotate().out()
rotate(() => time%360).out()

scale(1.5, 1, 1, 0.5, 0.5).out()
scale().out()
scale(1.5).out()
scale(1.5, 2).out()
scale(1.5, 2, 2).out()
scale(1.5, 2, 2, 0.5).out()

scrollX(0.5, 0).out()
scrollX().out()
scrollX(() => Math.sin(time)).out()

scrollY(0.5, 0).out()
scrollY().out()
scrollY(() => Math.sin(time)).out()

modulate(noise(3), 0.5).out()
modulate(osc(10)).out()
modulate(voronoi(), () => Math.sin(time)).out()

modulateHue(noise(3), 1).out()
modulateHue(osc(10)).out()
modulateHue(voronoi(), () => Math.sin(time)).out()

modulateKaleid(noise(3), 4).out()
modulateKaleid(osc(10)).out()
modulateKaleid(voronoi(), () => Math.sin(time) * 10).out()

modulatePixelate(noise(3), 10, 3).out()
modulatePixelate(osc(10)).out()
modulatePixelate(voronoi(), 20).out()

modulateRepeat(noise(3), 3, 3, 0.5, 0.5).out()
modulateRepeat(osc(10)).out()
modulateRepeat(voronoi(), 5, 5).out()
modulateRepeat(shape(4), 3, 3, () => Math.sin(time)).out()

modulateRepeatX(noise(3), 3, 0.5).out()
modulateRepeatX(osc(10)).out()
modulateRepeatX(voronoi(), () => Math.sin(time) * 5).out()

modulateRepeatY(noise(3), 3, 0.5).out()
modulateRepeatY(osc(10)).out()
modulateRepeatY(voronoi(), () => Math.sin(time) * 5).out()

modulateRotate(noise(3), 1, 0).out()
modulateRotate(osc(10)).out()
modulateRotate(voronoi(), () => Math.sin(time)).out()

modulateScale(noise(3), 1, 1).out()
modulateScale(osc(10)).out()
modulateScale(voronoi(), () => Math.sin(time) + 2).out()

modulateScrollX(noise(3), 0.5, 0).out()
modulateScrollX(osc(10)).out()
modulateScrollX(voronoi(), () => Math.sin(time)).out()

modulateScrollY(noise(3), 0.5, 0).out()
modulateScrollY(osc(10)).out()
modulateScrollY(voronoi(), () => Math.sin(time)).out()

add(noise(3), 1).out()
add(osc(10)).out()
add(voronoi(), () => Math.sin(time)).out()

blend(noise(3), 0.5).out()
blend(osc(10)).out()
blend(voronoi(), () => Math.sin(time)).out()

diff(noise(3)).out()
diff(osc(10)).out()
diff(voronoi()).out()

layer(shape(4).scale(0.5)).out()
layer(osc(10)).out()
layer(voronoi()).out()

mask(shape(4)).out()
mask(osc(10)).out()
mask(voronoi()).out()

mult(noise(3), 1).out()
mult(osc(10)).out()
mult(voronoi(), () => Math.sin(time)).out()

sub(noise(3)).out()
sub(osc(10)).out()
sub(voronoi()).out()

r().out()
g().out()
b().out()

hue(() => Math.sin(time)).out()
hue(0.5).out()
hue().out()
`;