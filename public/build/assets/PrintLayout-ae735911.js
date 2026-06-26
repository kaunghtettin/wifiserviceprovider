import{r as l,j as e,F as w,a as t,S}from"./app-5a3904bd.js";import{B as p,T as c}from"./Menu-417c120f.js";import{S as h,B as f,P as y}from"./Stack-7fccf957.js";import{T as v}from"./TextField-c634a742.js";import{M as F}from"./MenuItem-2c8ac5ae.js";import{A as z}from"./ArrowBack-7acd5ba1.js";import{P as H}from"./Print-df95680a.js";const r={a4:{label:"A4",width:"210mm",pageSize:"210mm 297mm",padding:3,minHeight:"297mm"},thermal58:{label:"Thermal 58mm",width:"58mm",pageSize:"58mm 297mm",padding:1.25,minHeight:"auto"},thermal80:{label:"Thermal 80mm",width:"80mm",pageSize:"80mm 297mm",padding:1.5,minHeight:"auto"}};function k({title:m,subtitle:s,backHref:g,children:o,defaultFormat:d="a4",toolbarExtra:x=null}){const[a,b]=l.useState(d in r?d:"a4"),i=l.useMemo(()=>r[a]||r.a4,[a]);return e(w,{children:[t(S,{title:m,children:t("style",{children:`
                    @page {
                        size: ${i.pageSize};
                        margin: 0;
                    }

                    @media print {
                        html,
                        body,
                        #app {
                            width: ${i.width};
                            min-width: ${i.width};
                            margin: 0;
                            background: #ffffff !important;
                        }
                    }
                `})}),e(p,{sx:{minHeight:"100vh",bgcolor:"#eef2f8",px:{xs:1.5,md:3},py:{xs:1.5,md:2.5},"@media print":{bgcolor:"#ffffff",p:0}},children:[e(h,{className:"print-toolbar",direction:{xs:"column",sm:"row"},spacing:1,sx:{mb:1.5,alignItems:{sm:"center"},justifyContent:"space-between","@media print":{display:"none"}},children:[e(p,{children:[t(c,{variant:"h6",sx:{fontWeight:800},children:m}),s?t(c,{variant:"body2",color:"text.secondary",children:s}):null]}),e(h,{direction:{xs:"column",sm:"row"},spacing:1,sx:{alignItems:{xs:"stretch",sm:"center"},flexWrap:{sm:"wrap"},justifyContent:"flex-end"},children:[x,t(v,{select:!0,size:"small",label:"Format",value:a,onChange:n=>b(n.target.value),sx:{minWidth:150},children:Object.entries(r).map(([n,u])=>t(F,{value:n,children:u.label},n))}),t(f,{component:"a",href:g,variant:"text",color:"inherit",startIcon:t(z,{}),children:"Back"}),t(f,{variant:"contained",startIcon:t(H,{}),onClick:()=>window.print(),children:"Print"})]})]}),t(y,{elevation:0,sx:{width:i.width,minHeight:i.minHeight,maxWidth:"100%",boxSizing:"border-box",mx:"auto",p:i.padding,bgcolor:"#ffffff",border:"1px solid rgba(15, 23, 42, 0.08)",boxShadow:"0 20px 60px rgba(15, 23, 42, 0.08)","@media print":{width:i.width,maxWidth:"none",minHeight:"auto",border:"none",boxShadow:"none",mx:0,p:i.padding}},children:typeof o=="function"?o({printFormat:a,printFormatConfig:i}):o})]})]})}export{k as P};
