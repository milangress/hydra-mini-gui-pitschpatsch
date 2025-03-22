// Comprehensive test cases for all Hydra functions
export const allFuncCode = `
// Color operations
osc().brightness(0.4).out()

osc().contrast(1.6).out()

osc().color(1,1,1,1).out()

osc().colorama(0.005).out()

osc().invert(1).out()

osc().luma(0.5,0.1).out()

osc().posterize(3,0.6).out()

osc().saturate(2).out()

osc().shift(0.5,0,0,0).out()

osc().thresh(0.5,0.04).out()

// Geometry operations
osc().kaleid(4).out()

osc().pixelate(20,20).out()

osc().repeat(3,3,0,0).out()

osc().repeatX(3,0).out()

osc().repeatY(3,0).out()

osc().rotate(10,0).out()

osc().scale(1.5,1,1,0.5,0.5).out()

osc().scrollX(0.5,0).out()

osc().scrollY(0.5,0).out()

// Modulation
noise().modulate(osc(),0.1).out()

osc().modulateHue(osc(),1).out()

osc().modulateKaleid(osc(),4).out()

osc().modulatePixelate(osc(),10,3).out()

osc().modulateRepeat(osc(),3,3,0.5,0.5).out()

osc().modulateRepeatX(osc(),3,0.5).out()

osc().modulateRepeatY(osc(),3,0.5).out()

osc().modulateRotate(osc(),1,0).out()

osc().modulateScale(osc(),1,1).out()

osc().modulateScrollX(osc(),0.5,0).out()

osc().modulateScrollY(osc(),0.5,0).out()

// Blend operations
osc().add(osc(),1).out()

osc().blend(osc(),0.5).out()

osc().diff(osc()).out()

osc().layer(osc()).out()

osc().mask(osc()).out()

osc().mult(osc(),1).out()

// Source generators
noise(10,0.1).out()

osc(60,0.1,0).out()

shape(3,0.3,0.01).out()

gradient(0).out()

solid(0,0,0,1).out()

voronoi(5,0.3,0.3).out()

// Channel operations
osc().r().out()
osc().g().out()
osc().b().out()
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
export const defaultCode = `
osc(82,0.09,0.89999)
  .rotate(0.5)
  .out()

osc(400,1.02).scroll(0).out()

src(o0)
  .modulate(
    osc(6,0,1.5).modulate(noise(3).sub(gradient()),1)
    .brightness(-0.5)
  ,0.003)
  .layer(
  osc(30,0.1,1.5).mask(shape(4,0.3,0))
  ).out(o0)

var epsilon=0.003
var func = () => noise(9.9,0.35)
solid(3.45,0,255).layer(func().luma(-epsilon,0)).out(o0)

osc(5, 1.65, -0.021)
    .kaleid([2,3.3,5,7,8,9,10].fast(0.1))
    .color(0.5, 0.81)
    .colorama(0.4)
    .rotate(0.009,()=>Math.sin(time)* -0.001 )
    .modulateRotate(o0,()=>Math.sin(time) * 0.003)
    .modulate(o0, 0.9)
    .scale(0.9)
    .out(o0)
`;

export function makeCodeString(code) {
  const coolifyUrl = process.env.COOLIFY_URL || 'http://localhost:3000';

  const loadHydraUrl = `await loadScript("${coolifyUrl}/hydra-pitschpatsch.js")`;

  return `${loadHydraUrl}\n${code}`;
}

export function getCode(testMode) {
  const code = testMode === 'allFunc' ? allFuncCode : 
  testMode === 'special' ? specialCases : defaultCode;
  return makeCodeString(code);
}

export function getAllCode() {
  return [makeCodeString(allFuncCode), makeCodeString(specialCases), makeCodeString(defaultCode)];
}

export function makeHydraUrl(codeString) {
  function encodeForHydraURL(code) {
    return btoa(encodeURIComponent(code));
  }
  
  const encodedCode = encodeForHydraURL(codeString);
  const hydraUrl = `https://hydra.ojack.xyz/?code=${encodedCode}`;
  return hydraUrl;
}
