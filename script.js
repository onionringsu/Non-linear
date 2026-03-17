let activeInput = null;

function refreshPreviews(){
  updatePrettyPreview('eq1', 'eq1Preview');
  updatePrettyPreview('eq2', 'eq2Preview');
}

function switchKeyboardTab(tabName, clickedTab){
  document.querySelectorAll('.keyboardTab').forEach(tab => {
    tab.classList.remove('active');
  });

  document.querySelectorAll('.keyboardPanel').forEach(panel => {
    panel.classList.remove('active');
  });

  clickedTab.classList.add('active');

  const panel = document.getElementById(`keyboard-${tabName}`);
  if(panel){
    panel.classList.add('active');
  }

  if(activeInput){
    activeInput.focus();
  }
}

function setupKeyboardInputs(){
  const eq1 = document.getElementById('eq1');
  const eq2 = document.getElementById('eq2');

  [eq1, eq2].forEach(input => {
    input.addEventListener('focus', () => setActiveInput(input));
    input.addEventListener('click', () => setActiveInput(input));
    input.addEventListener('keyup', () => {
      setActiveInput(input);
      updatePrettyPreview('eq1', 'eq1Preview');
      updatePrettyPreview('eq2', 'eq2Preview');
    });
    input.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){
    e.preventDefault();
    solveSystem();
  }
});
    input.addEventListener('select', () => setActiveInput(input));
    input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9xy+\-*/^=()., ]/gi, '');
    const oldValue = input.value;
    const oldPos = input.selectionStart ?? oldValue.length;

    const normalized = normalizeImplicitMultiplication(oldValue);

    if(normalized !== oldValue){
    input.value = normalized;
    const diff = normalized.length - oldValue.length;
    const newPos = Math.max(0, oldPos + diff);
    input.setSelectionRange(newPos, newPos);
  }

  updatePrettyPreview('eq1', 'eq1Preview');
  updatePrettyPreview('eq2', 'eq2Preview');
});
  });

  setActiveInput(eq1);
  updatePrettyPreview('eq1', 'eq1Preview');
  updatePrettyPreview('eq2', 'eq2Preview');
}


function setActiveInput(input){
  activeInput = input;

  document.querySelectorAll('#eq1, #eq2').forEach(el => {
    el.classList.remove('activeMathInput');
  });

  input.classList.add('activeMathInput');

  const label = document.getElementById('activeInputLabel');
  if(label){
    label.textContent = `Editing: ${input.id === 'eq1' ? 'Equation 1' : 'Equation 2'}`;
  }
}

function insertText(text){
  if(!activeInput){
    activeInput = document.getElementById('eq1');
  }

  activeInput.focus();

  const start = activeInput.selectionStart ?? activeInput.value.length;
  const end = activeInput.selectionEnd ?? activeInput.value.length;
  const before = activeInput.value.slice(0, start);
  const after = activeInput.value.slice(end);

  let finalText = text;
  const beforeChar = before.slice(-1);

  if(needsMultiplication(beforeChar, text)){
    finalText = '*' + text;
  }

  activeInput.value = before + finalText + after;

  const newPos = start + finalText.length;
  activeInput.setSelectionRange(newPos, newPos);

  refreshPreviews();
  activeInput.focus();
}

function insertExponent(){
  if(!activeInput){
    activeInput = document.getElementById('eq1');
  }

  activeInput.focus();

  const start = activeInput.selectionStart ?? activeInput.value.length;
  const end = activeInput.selectionEnd ?? activeInput.value.length;
  const value = activeInput.value;

  if(start !== end){
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);

    activeInput.value = before + `(${selected})^` + after;

    const newPos = (before + `(${selected})^`).length;
    activeInput.setSelectionRange(newPos, newPos);
    refreshPreviews();
    activeInput.focus();
    return;
  }

  const before = value.slice(0, start);
  const after = value.slice(end);
  const beforeChar = before.slice(-1);

  let insertValue = '^';

  if(start === 0){
    insertValue = '^';
  } else if(isDigitChar(beforeChar) || isLetterVar(beforeChar) || beforeChar === ')'){
    insertValue = '^';
  } else {
    insertValue = '^';
  }

  activeInput.value = before + insertValue + after;
  activeInput.setSelectionRange(start + insertValue.length, start + insertValue.length);
  refreshPreviews();
}

function backspaceInput(){
  if(!activeInput){
    activeInput = document.getElementById('eq1');
  }

  activeInput.focus();

  const start = activeInput.selectionStart ?? activeInput.value.length;
  const end = activeInput.selectionEnd ?? activeInput.value.length;
  const value = activeInput.value;

  if(start !== end){
    activeInput.value = value.slice(0, start) + value.slice(end);
    activeInput.setSelectionRange(start, start);
    refreshPreviews();
    activeInput.focus();
    return;
  }

  if(start > 0){
    activeInput.value = value.slice(0, start - 1) + value.slice(start);
    activeInput.setSelectionRange(start - 1, start - 1);
    refreshPreviews();
  }
}

function clearActiveInput(){
  if(!activeInput){
    activeInput = document.getElementById('eq1');
  }
  activeInput.value = '';
  refreshPreviews();
  activeInput.focus();
}

function clearAll(){
  document.getElementById('eq1').value='';
  document.getElementById('eq2').value='';
  document.getElementById('error').innerHTML ='';
  document.getElementById('resultCard').style.display='none';
  refreshPreviews();
}

function parseSides(eq){
  const parts=eq.split('=');
  if(parts.length!==2) throw new Error("Each equation must contain exactly one '=' sign.");
  return {left:parts[0].trim(), right:parts[1].trim()};
}

function toZeroExpression(eq){
  const {left,right}=parseSides(eq);
  return `(${left}) - (${right})`;
}

function formatMath(str){
  return String(str)
    .replace(/\^2/g,'²')
    .replace(/\^3/g,'³')
    .replace(/sqrt\(([^)]+)\)/g,'√($1)');
}

function toSuperscriptPreview(text){
  return String(text)
    .replace(/\*/g, '')
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³');
}

function updatePrettyPreview(inputId, previewId){
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if(!input || !preview) return;

  const value = input.value || '';
  preview.textContent = toSuperscriptPreview(value);
}

function isDigitChar(ch){
  return /[0-9]/.test(ch);
}

function isLetterVar(ch){
  return /[xy]/i.test(ch);
}

function needsMultiplication(beforeChar, newText){
  if(!beforeChar) return false;

  const first = newText ? newText[0] : '';

  const beforeIsNumber = isDigitChar(beforeChar);
  const beforeIsVar = isLetterVar(beforeChar);
  const beforeIsCloseParen = beforeChar === ')';

  const newStartsVar = isLetterVar(first);
  const newStartsOpenParen = first === '(';

  if((beforeIsNumber || beforeIsVar || beforeIsCloseParen) && (newStartsVar || newStartsOpenParen)){
    return true;
  }

  if((beforeIsVar || beforeIsCloseParen) && isDigitChar(first)){
    return true;
  }

  return false;
}

function normalizeImplicitMultiplication(text){
  return String(text)
    .replace(/(\d)([xy])/gi, '$1*$2')
    .replace(/([xy])(\d)/gi, '$1*$2')
    .replace(/([xy])([xy])/gi, '$1*$2')
    .replace(/(\d)\(/g, '$1*(')
    .replace(/\)(\d)/g, ')*$1')
    .replace(/([xy])\(/gi, '$1*(')
    .replace(/\)([xy])/gi, ')*$1')
    .replace(/\)\(/g, ')*(');
}

function gcd(a,b){
  a=Math.abs(Math.round(a));
  b=Math.abs(Math.round(b));
  while(b){const t=b;b=a%b;a=t;}
  return a||1;
}

function decimalToFractionString(num,maxDen=1000,eps=1e-10){
  if(!isFinite(num)) return String(num);
  if(Math.abs(num)<eps) return '0';
  if(Number.isInteger(num)) return String(num);
  const sign=num<0?'-':''; num=Math.abs(num);
  let bestNum=1,bestDen=1,bestErr=Math.abs(num-1);
  for(let den=1; den<=maxDen; den++){
    const n=Math.round(num*den);
    const err=Math.abs(num - n/den);
    if(err<bestErr){bestErr=err;bestNum=n;bestDen=den;if(err<eps) break;}
  }
  const d=gcd(bestNum,bestDen);
  bestNum/=d; bestDen/=d;
  return bestDen===1 ? sign+bestNum : `${sign}${bestNum}/${bestDen}`;
}

function parseLinearInSquares(eq){
  const {left,right}=parseSides(eq);
  let s=`${left}-(${right})`.replace(/\s+/g,'');
  if(/\b(sin|cos|tan|log|ln|sqrt|abs)\b/i.test(s)) return null;
  if(/\^((?!2)\d+)/.test(s)) return null;
  s=s.replace(/\*\*/g,'^');
  s=s.replace(/\(/g,'').replace(/\)/g,'');
  s=s.replace(/-/g,'+-');
  if(s.startsWith('+')) s=s.slice(1);
  const terms=s.split('+').filter(Boolean);
  let a=0,b=0,c=0;
  for(let term of terms){
    if(term.includes('x') && !term.includes('x^2')) return null;
    if(term.includes('y') && !term.includes('y^2')) return null;
    if(term.includes('x^2') && term.includes('y^2')) return null;
    if(term.includes('x^2')){
      let coeff=term.replace('x^2','').replace(/\*$/,'');
      if(coeff==='') coeff='1';
      if(coeff==='-') coeff='-1';
      a += Number(math.evaluate(coeff));
    } else if(term.includes('y^2')){
      let coeff=term.replace('y^2','').replace(/\*$/,'');
      if(coeff==='') coeff='1';
      if(coeff==='-') coeff='-1';
      b += Number(math.evaluate(coeff));
    } else {
      c += Number(math.evaluate(term));
    }
  }
  return {a,b,c:-c};
}

function solveSquareSystem(eq1,eq2){
  const e1=parseLinearInSquares(eq1);
  const e2=parseLinearInSquares(eq2);
  if(!e1 || !e2) return null;
  const det=e1.a*e2.b - e2.a*e1.b;
  if(Math.abs(det)<1e-12) return null;
  const x2=(e1.c*e2.b - e2.c*e1.b)/det;
  const y2=(e1.a*e2.c - e2.a*e1.c)/det;
  if(x2 < -1e-10 || y2 < -1e-10) throw new Error('No real solution found because one squared value is negative.');
  const sx=Math.sqrt(Math.max(0,x2));
  const sy=Math.sqrt(Math.max(0,y2));
  const xs=[sx];
  const ys=[sy];
  const solutions=[];
  for(const x of xs){
    for(const y of ys){
      if(!solutions.some(s=>Math.abs(s.x-x)<1e-9 && Math.abs(s.y-y)<1e-9)) solutions.push({x,y});
    }
  }
  return {mode:'square',eq1,eq2,e1,e2,x2,y2,solutions};
}

function parseLinearEquation(eq){
  const expr = toZeroExpression(eq);
  const compiled = math.compile(expr);

  const f = (x,y) => compiled.evaluate({x,y});
  const c = f(0,0);
  const ax = f(1,0) - c;
  const by = f(0,1) - c;
  const mixed = f(1,1) - c - ax - by;

  if(Math.abs(mixed) > 1e-8) return null;

  const testX2 = f(2,0) - (c + ax*2);
  const testY2 = f(0,2) - (c + by*2);
  if(Math.abs(testX2) > 1e-8 || Math.abs(testY2) > 1e-8) return null;

  return {a:ax, b:by, c:-c};
}

function solveLinearNonlinearSystem(eq1, eq2){
  const l1 = parseLinearEquation(eq1);
  const l2 = parseLinearEquation(eq2);

  let linearEq = null;
  let nonlinearEq = null;

  if(l1 && !l2){
    linearEq = {eq:eq1, coeffs:l1};
    nonlinearEq = eq2;
  } else if(!l1 && l2){
    linearEq = {eq:eq2, coeffs:l2};
    nonlinearEq = eq1;
  } else {
    return null;
  }

  const {a,b,c} = linearEq.coeffs;

  let solvedVar, freeVar, substituteExpr;

  if(Math.abs(b) > 1e-10){
    solvedVar = 'y';
    freeVar = 'x';
    substituteExpr = `(${c} - (${a})*x)/(${b})`;
  } else if(Math.abs(a) > 1e-10){
    solvedVar = 'x';
    freeVar = 'y';
    substituteExpr = `(${c} - (${b})*y)/(${a})`;
  } else {
    return null;
  }

  const nonlinearZero = toZeroExpression(nonlinearEq);
  const substituted = nonlinearZero.replace(
    new RegExp(`\\b${solvedVar}\\b`, 'g'),
    `(${substituteExpr})`
  );

  const oneVarExpr = math.simplify(substituted).toString();
  const compiled = math.compile(oneVarExpr);
  const derivative = math.compile(math.derivative(oneVarExpr, freeVar).toString());

  const roots = [];
  for(let guess=-8; guess<=8; guess+=1){
    let v = guess;
    let ok = false;

    for(let i=0; i<40; i++){
      let fv, dfv;
      try{
        fv = compiled.evaluate({[freeVar]:v});
        dfv = derivative.evaluate({[freeVar]:v});
      }catch{
        ok = false;
        break;
      }

      if(!isFinite(fv) || !isFinite(dfv) || Math.abs(dfv) < 1e-10) break;

      const next = v - fv/dfv;
      if(!isFinite(next)) break;

      if(Math.abs(next - v) < 1e-10){
        v = next;
        ok = true;
        break;
      }

      v = next;
    }

    if(ok){
      const exists = roots.some(r => Math.abs(r - v) < 1e-6);
      if(!exists) roots.push(v);
    }
  }

  if(!roots.length) return null;

  const solutions = roots.map(root => {
    if(freeVar === 'x'){
      const x = root;
      const y = math.evaluate(substituteExpr, {x});
      return {x,y};
    } else {
      const y = root;
      const x = math.evaluate(substituteExpr, {y});
      return {x,y};
    }
  }).filter(sol => isFinite(sol.x) && isFinite(sol.y));

  if(!solutions.length) return null;

  return {
    mode:'substitution',
    eq1,
    eq2,
    linearEquation: linearEq.eq,
    nonlinearEquation: nonlinearEq,
    solvedVar,
    freeVar,
    substituteExpr,
    oneVarExpr,
    solutions
  };
}

function formatSubstitutionAnswer(data){
  return data.solutions.map((s,i)=>
`Solution ${i+1}
x = ${decimalToFractionString(s.x,1000,1e-9)}
y = ${decimalToFractionString(s.y,1000,1e-9)}`
  ).join('\n\n');
}

function buildSubstitutionSteps(data){
  return [
    {
      title:'Step 1',
      body:formatMath(`Given:
${data.eq1}
${data.eq2}`)
    },
    {
      title:'Step 2',
      body:formatMath(`Use the linear equation:

${data.linearEquation}

Solve for ${data.solvedVar}:

${data.solvedVar} = ${data.substituteExpr}`)
    },
    {
      title:'Step 3',
      body:formatMath(`Substitute ${data.solvedVar} into the nonlinear equation:

${data.nonlinearEquation}

After substitution:

${data.oneVarExpr} = 0`)
    },
    {
      title:'Step 4',
      body:formatMath(`Solve the resulting equation for ${data.freeVar}.

This gives the value(s) of ${data.freeVar} that satisfy the system.`)
    },
    {
      title:'Step 5',
      body:formatMath(`Substitute the value of ${data.freeVar} back into

${data.solvedVar} = ${data.substituteExpr}

to solve for ${data.solvedVar}.`)
    },
    {
      title:'Step 6',
      body:'Write the ordered pair(s) as the final solution.'
    }
  ];
}

function radicalForSquareValue(squareValue){
  if(Math.abs(squareValue)<1e-12) return '0';
  return `√(${decimalToFractionString(squareValue)})`;
}

function formatSquareAnswer(data){
  const x2=decimalToFractionString(data.x2);
  const y2=decimalToFractionString(data.y2);

  return formatMath(
`x^2 = ${x2}
y^2 = ${y2}

x = sqrt(${x2})
y = sqrt(${y2})

Solution:
(x, y) = (${radicalForSquareValue(data.x2)}, ${radicalForSquareValue(data.y2)})`
  );
}

function buildSquareSteps(data){
  const c1 = decimalToFractionString(data.e1.c);
  const c2 = decimalToFractionString(data.e2.c);

  return [
    {
      title:'Step 1',
      body:formatMath(
`Given:
${data.eq1}
${data.eq2}`
      )
    },

    {
      title:'Step 2',
      body:formatMath(
`From the first equation:

x^2 + y^2 = ${c1}

Solve for y^2:

y^2 = ${c1} - x^2`
      )
    },

    {
      title:'Step 3',
      body:formatMath(
`Substitute into the second equation:

${data.eq2}

Replace y^2:

3x^2 - 2(${c1} - x^2) = ${c2}`
      )
    },

    {
      title:'Step 4',
      body:formatMath(
`Simplify:

3x^2 - 2${c1} + 2x^2 = ${c2}

Combine like terms:

5x^2 = ${decimalToFractionString(data.x2 * 5)}`
      )
    },

    {
      title:'Step 5',
      body:formatMath(
`Solve for x^2:

x^2 = ${decimalToFractionString(data.x2)}`
      )
    },

    {
      title:'Step 6',
      body:formatMath(
`Substitute back:

y^2 = ${c1} - ${decimalToFractionString(data.x2)}

y^2 = ${decimalToFractionString(data.y2)}`
      )
    },

    {
      title:'Step 7',
      body:formatMath(
`Take square roots:

x = sqrt(${decimalToFractionString(data.x2)})
y = sqrt(${decimalToFractionString(data.y2)})`
      )
    }
  ];
}

function evaluateExpression(expr,x,y){ return math.evaluate(expr,{x,y}); }
function newtonSystem(expr1,expr2,x0,y0){
  let x=x0,y=y0,h=1e-6;
  for(let i=0;i<40;i++){
    let f1,f2; try{f1=evaluateExpression(expr1,x,y); f2=evaluateExpression(expr2,x,y);}catch{return null;}
    if(!isFinite(f1)||!isFinite(f2)) return null;
    if(Math.abs(f1)<1e-9 && Math.abs(f2)<1e-9) return {x,y};
    const df1dx=(evaluateExpression(expr1,x+h,y)-evaluateExpression(expr1,x-h,y))/(2*h);
    const df1dy=(evaluateExpression(expr1,x,y+h)-evaluateExpression(expr1,x,y-h))/(2*h);
    const df2dx=(evaluateExpression(expr2,x+h,y)-evaluateExpression(expr2,x-h,y))/(2*h);
    const df2dy=(evaluateExpression(expr2,x,y+h)-evaluateExpression(expr2,x,y-h))/(2*h);
    const det=df1dx*df2dy-df1dy*df2dx;
    if(!isFinite(det)||Math.abs(det)<1e-12) return null;
    const dx=(-f1*df2dy + f2*df1dy)/det;
    const dy=(-df1dx*f2 + df2dx*f1)/det;
    x+=dx; y+=dy;
    if(!isFinite(x)||!isFinite(y)) return null;
  }
  const g1=evaluateExpression(expr1,x,y), g2=evaluateExpression(expr2,x,y);
  return Math.abs(g1)<1e-6 && Math.abs(g2)<1e-6 ? {x,y} : null;
}

function solveGenericSystem(eq1,eq2){
  const expr1=toZeroExpression(eq1), expr2=toZeroExpression(eq2);
  const solutions=[];
  for(let x=-6;x<=6;x++){
    for(let y=-6;y<=6;y++){
      const root=newtonSystem(expr1,expr2,x,y);
      if(root && !solutions.some(s=>Math.abs(s.x-root.x)<1e-6 && Math.abs(s.y-root.y)<1e-6)) solutions.push(root);
    }
  }
  if(!solutions.length) throw new Error('No real solution found, or this system needs a stronger solving method.');
  return {mode:'generic',eq1,eq2,expr1,expr2,solutions};
}

function checkSolution(eq1,eq2,sol){
  const e1=parseSides(eq1), e2=parseSides(eq2);
  const left1=math.evaluate(e1.left,sol), right1=math.evaluate(e1.right,sol);
  const left2=math.evaluate(e2.left,sol), right2=math.evaluate(e2.right,sol);
  return {left1,right1,left2,right2,ok1:Math.abs(left1-right1)<1e-6,ok2:Math.abs(left2-right2)<1e-6};
}

function formatChecking(eq1,eq2,solutions,exact){
  return solutions.map((sol,i)=>{
    const c=checkSolution(eq1,eq2,sol);
    const head=solutions.length>1?`Solution ${i+1}\n\n`:'';
    const f=exact?decimalToFractionString:(n=>decimalToFractionString(n,1000,1e-9));

    return head +
`Equation 1:
${f(c.left1)} = ${f(c.right1)} ${c.ok1?'✓':'✗'}

Equation 2:
${f(c.left2)} = ${f(c.right2)} ${c.ok2?'✓':'✗'}`;
  }).join('\n\n----------------------\n\n');
}

function buildGenericSteps(data){
  return [
    {
      title:'Step 1',
      body:formatMath(`Given:\n${data.eq1}\n${data.eq2}`)
    },
    {
      title:'Step 2',
      body:formatMath(`Rewrite each equation so one side is equal to 0:\n${data.expr1} = 0\n${data.expr2} = 0`)
    },
    {
      title:'Step 3',
      body:'Use a nonlinear solving method to test possible real intersection points.'
    },
    {
      title:'Step 4',
      body:'List the real solution found by the solver.'
    }
  ];
}

function formatGenericAnswer(data){
  return data.solutions.map((s,i)=>`Solution ${i+1}\nx = ${decimalToFractionString(s.x,1000,1e-9)}\ny = ${decimalToFractionString(s.y,1000,1e-9)}`).join('\n\n');
}

function smartSolve(eq1, eq2){
  const squareData = solveSquareSystem(eq1, eq2);
  if(squareData){
    squareData.mode = 'square';
    return squareData;
  }

  const substitutionData = solveLinearNonlinearSystem(eq1, eq2);
  if(substitutionData){
    substitutionData.mode = 'substitution';
    return substitutionData;
  }

  const genericData = solveGenericSystem(eq1, eq2);
  genericData.mode = 'generic';
  return genericData;
}

function solveSystem(){
  const eq1=document.getElementById('eq1').value.trim();
  const eq2=document.getElementById('eq2').value.trim();
  const error=document.getElementById('error');
  const resultCard=document.getElementById('resultCard');
  const solDiv=document.getElementById('solutions');
  const checkDiv=document.getElementById('checking');
  const stepsDiv=document.getElementById('steps');

  error.innerHTML='';
  resultCard.style.display='none';
  stepsDiv.innerHTML='';

  try{
    if(!eq1 || !eq2) throw new Error('Please enter both equations.');

    parseSides(eq1);
    parseSides(eq2);

    const result = smartSolve(eq1, eq2);

    if(result.mode === 'square'){
      solDiv.innerHTML = formatSquareAnswer(result);
      checkDiv.innerHTML = formatChecking(eq1, eq2, result.solutions, true);
      const steps = buildSquareSteps(result);
      stepsDiv.innerHTML = steps.map((step, index) =>
        `<details class="stepCard" ${index === 0 ? 'open' : ''}>
        <summary class="stepTitle">${step.title}</summary>
        <div class="solution">${step.body}</div>
        </details>`
      ).join('');
    } else if(result.mode === 'substitution'){
      solDiv.innerHTML = formatMath(formatSubstitutionAnswer(result));
      checkDiv.innerHTML = formatMath(formatChecking(eq1, eq2, result.solutions, false));
      const steps = buildSubstitutionSteps(result);
      stepsDiv.innerHTML = steps.map((step, index) =>
        `<details class="stepCard" ${index === 0 ? 'open' : ''}>
        <summary class="stepTitle">${step.title}</summary>
        <div class="solution">${step.body}</div>
        </details>`
      ).join('');
    } else {
      solDiv.innerHTML = formatMath(formatGenericAnswer(result));
      checkDiv.innerHTML = formatMath(formatChecking(eq1, eq2, result.solutions, false));
      const steps = buildGenericSteps(result);
      stepsDiv.innerHTML = steps.map(step =>
        `<div class="stepCard"><div class="stepTitle">${step.title}</div><div class="solution">${step.body}</div></div>`
      ).join('');
    }

    resultCard.style.display='block';
  } catch(err){
    error.textContent = err.message;
  }
}

document.addEventListener('DOMContentLoaded', setupKeyboardInputs);

window.addEventListener('load', () => {
  const eq1 = document.getElementById('eq1');
  if(eq1){
    eq1.focus();
  }
});