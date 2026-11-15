// Genera "Información legal.pdf" a partir de tools/informacion-legal.html
// Uso: node tools/gen_informacion_legal.js [salida.pdf]   (requiere playwright con chromium)
const {chromium}=require('playwright');const path=require('path');
(async()=>{const out=process.argv[2]||path.join(__dirname,'..','Información legal.pdf');
 const b=await chromium.launch();const p=await b.newPage();
 await p.goto('file://'+path.join(__dirname,'informacion-legal.html'));await p.evaluate(()=>document.fonts.ready);
 await p.pdf({path:out,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',
  footerTemplate:`<div style="width:100%;font:7.5pt Inter,Arial,sans-serif;color:#6f655c;display:flex;justify-content:space-between;padding:0 20mm"><span>Rancho Ruiseñor · Comida natural, de origen campesino · Barranquilla y el Atlántico · WhatsApp 319 427 5785</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`});
 await b.close();console.log('ok',out)})();
