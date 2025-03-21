// Comprehensive test cases for all Hydra functions
export const code = `
// Color operations
osc(60,0.1,0).brightness(0.4).out(o0)
osc(60,0.1,0).contrast(1.6).out(o1)
osc(60,0.1,0).color(1,1,1,1).out(o2)
osc(60,0.1,0).colorama(0.005).out(o3)
render(o0)

osc(60,0.1,0).invert(1).out(o0)
osc(60,0.1,0).luma(0.5,0.1).out(o1)
osc(60,0.1,0).posterize(3,0.6).out(o2)
osc(60,0.1,0).saturate(2).out(o3)
render(o1)

osc(60,0.1,0).shift(0.5,0,0,0).out(o0)
osc(60,0.1,0).thresh(0.5,0.04).out(o1)

// Geometry operations
osc(60,0.1,0).kaleid(4).out(o0)
osc(60,0.1,0).pixelate(20,20).out(o1)
osc(60,0.1,0).repeat(3,3,0,0).out(o2)
osc(60,0.1,0).repeatX(3,0).out(o3)
render(o2)

osc(60,0.1,0).repeatY(3,0).out(o0)
osc(60,0.1,0).rotate(10,0).out(o1)
osc(60,0.1,0).scale(1.5,1,1,0.5,0.5).out(o2)
osc(60,0.1,0).scrollX(0.5,0).out(o3)
render(o3)

osc(60,0.1,0).scrollY(0.5,0).out(o0)

// Modulation
noise(10,0.1).modulate(osc(60,0.1,0),0.1).out(o0)
osc(60,0.1,0).modulateHue(osc(60,0.1,0),1).out(o1)
osc(60,0.1,0).modulateKaleid(osc(60,0.1,0),4).out(o2)
osc(60,0.1,0).modulatePixelate(osc(60,0.1,0),10,3).out(o3)
render(o0)

osc(60,0.1,0).modulateRepeat(osc(60,0.1,0),3,3,0.5,0.5).out(o0)
osc(60,0.1,0).modulateRepeatX(osc(60,0.1,0),3,0.5).out(o1)
osc(60,0.1,0).modulateRepeatY(osc(60,0.1,0),3,0.5).out(o2)
osc(60,0.1,0).modulateRotate(osc(60,0.1,0),1,0).out(o3)
render(o1)

osc(60,0.1,0).modulateScale(osc(60,0.1,0),1,1).out(o0)
osc(60,0.1,0).modulateScrollX(osc(60,0.1,0),0.5,0).out(o1)
osc(60,0.1,0).modulateScrollY(osc(60,0.1,0),0.5,0).out(o2)

// Blend operations
osc(60,0.1,0).add(osc(60,0.1,0),1).out(o0)
osc(60,0.1,0).blend(osc(60,0.1,0),0.5).out(o1)
osc(60,0.1,0).diff(osc(60,0.1,0)).out(o2)
osc(60,0.1,0).layer(osc(60,0.1,0)).out(o3)
render(o2)

osc(60,0.1,0).mask(osc(60,0.1,0)).out(o0)
osc(60,0.1,0).mult(osc(60,0.1,0),1).out(o1)

// Source generators
noise(10,0.1).out(o0)
osc(60,0.1,0).out(o1)
shape(3,0.3,0.01).out(o2)
gradient(0).out(o3)
render(o3)

solid(0,0,0,1).out(o0)
voronoi(5,0.3,0.3).out(o1)

// Channel operations
osc(60,0.1,0).r().out(o0)
osc(60,0.1,0).g().out(o1)
osc(60,0.1,0).b().out(o2)
`

// Special cases and complex examples
export const specialCases = `
// Array examples
osc([1,2,3].fast(1)).out(o0)
osc([1,2,3].smooth(1)).out(o1)
osc([1,2,3].ease('linear')).out(o2)
osc([1,2,3].offset(0.5)).out(o3)
osc([1,2,3].fit(0,1)).out(o0)

// Audio reactive examples
setBins(4)
setSmooth(0.4)
setCutoff(2)
setScale(10)
osc(60,0.1,0).scale(() => fft[0]).out(o0)

// Complex patterns
osc(5, 1.65, -0.021)
  .kaleid([2,3.3,5,7,8,9,10].fast(0.1))
  .color(0.5, 0.81)
  .colorama(0.4)
  .rotate(0.009,()=>Math.sin(time)* -0.001 )
  .modulateRotate(o0,()=>Math.sin(time) * 0.003)
  .modulate(o0, 0.9)
  .scale(0.9)
  .out(o0)

// Motion blur feedback
osc()
  .thresh()
  .blend(o0, 0.9)
  .out()

// Transparent masking
osc()
  .layer(
    osc(30, 0.1, 2)
      .mask(shape(4))
  )
  .out()
`
