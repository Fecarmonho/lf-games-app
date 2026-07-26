import { useState, useEffect, useMemo } from "react";
import logoImg from "./logo.png";

import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBIr9egtBxjjdXaIMGLKYlxsyitz4Vx_vk",
  authDomain: "lf-games-app.firebaseapp.com",
  projectId: "lf-games-app",
  storageBucket: "lf-games-app.firebasestorage.app",
  messagingSenderId: "864404535098",
  appId: "1:864404535098:web:a2253048e79b812ff0c203"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

function formatData(iso) {
  if (!iso) return "";
  const partes = iso.slice(0, 10).split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function lerImagemComoBase64(file, maxLado = 480, qualidade = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!file.type || !file.type.startsWith("image/")) return reject(new Error("Arquivo não é uma imagem"));
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxLado || height > maxLado) {
          if (width > height) { height = Math.round(height * (maxLado / width)); width = maxLado; }
          else { width = Math.round(width * (maxLado / height)); height = maxLado; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function hojeLocal() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #09090b;
    --surface: #131316;
    --surface2: #1a1a1f;
    --surface3: #24242b;
    --border: rgba(255,255,255,0.07);
    --border2: rgba(255,255,255,0.12);
    --text: #f2f2f4;
    --text2: #8a8a96;
    --accent: #ff2d4d;
    --accent2: #ff6b83;
    --neon-blue: #3ea6ff;
    --neon-purple: #a259ff;
    --green: #3ecf8e;
    --red: #f0426a;
    --yellow: #f5a623;
    --blue: #3ea6ff;
    --sidebar-w: 260px;
    --radius: 10px;
    --radius-sm: 7px;
    --glow-accent: 0 0 16px rgba(255,45,77,0.35);
  }

  body { background: var(--bg); background-image: radial-gradient(circle at 15% 0%, rgba(255,45,77,0.05), transparent 40%), radial-gradient(circle at 85% 100%, rgba(62,166,255,0.05), transparent 40%); color: var(--text); font-family: 'DM Sans', sans-serif; line-height: 1.5; min-height: 100vh; }
  h1,h2,h3,h4 { font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px; }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--surface3); border-radius: 99px; }

  .app { display: flex; height: 100vh; overflow: hidden; }

  .sidebar {
    width: var(--sidebar-w);
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column; flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(.4,0,.2,1);
    z-index: 100;
  }
  .sidebar-logo { padding: 20px 20px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
  .logo-img { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; filter: drop-shadow(0 0 6px rgba(255,45,77,0.25)); }
  .logo-img img { width: 100%; height: 100%; object-fit: contain; }
  .logo-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 2px; color: var(--accent); line-height: 1; }
  .logo-sub { font-size: 10px; color: var(--text2); letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }

  .sidebar-nav { flex: 1; overflow-y: auto; padding: 14px 10px; }
  .nav-label { font-size: 10px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 1.2px; padding: 10px 10px 4px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius-sm); cursor: pointer; color: var(--text2); font-size: 13.5px; font-weight: 500; transition: all 0.15s; user-select: none; border-left: 2px solid transparent; margin-bottom: 2px; }
  .nav-item:hover { background: var(--surface2); color: var(--text); }
  .nav-item.active { background: rgba(255,45,77,0.08); color: var(--accent2); border-left-color: var(--accent); }
  .nav-item svg { width: 16px; height: 16px; flex-shrink: 0; }

  .sidebar-footer { padding: 12px 10px 16px; border-top: 1px solid var(--border); }
  .footer-btn { display: flex; align-items: center; gap: 9px; padding: 8px 12px; border-radius: var(--radius-sm); cursor: pointer; color: var(--text2); font-size: 12.5px; font-weight: 500; background: none; border: none; width: 100%; text-align: left; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
  .footer-btn:hover { background: var(--surface2); color: var(--text); }
  .footer-btn.danger:hover { color: var(--red); background: rgba(240,96,96,0.07); }
  .footer-btn svg { width: 14px; height: 14px; }
  .sync-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); margin-left: auto; box-shadow: 0 0 6px var(--green); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

  .main { flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-width: 0; }
  .page { padding: 36px 48px; flex: 1; max-width: 1600px; width: 100%; margin: 0 auto; }
  .page-header { margin-bottom: 28px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .page-title { font-size: 28px; color: var(--text); line-height: 1; }
  .page-sub { font-size: 13px; color: var(--text2); margin-top: 4px; }

  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .card-header { padding: 18px 20px 0; display: flex; align-items: center; justify-content: space-between; }
  .card-title { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 1px; color: var(--text2); }
  .card-body { padding: 18px 20px; }

  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 28px; }
  .stats-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 18px; position: relative; overflow: hidden; transition: transform 0.15s, box-shadow 0.15s; min-width: 0; }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.3); }
  .stat-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; }
  .stat-card.green::after { background: linear-gradient(90deg, var(--green), transparent); }
  .stat-card.red::after   { background: linear-gradient(90deg, var(--red), transparent); }
  .stat-card.blue::after  { background: linear-gradient(90deg, var(--blue), transparent); }
  .stat-card.gold::after  { background: linear-gradient(90deg, var(--accent), transparent); }
  .stat-card.green { border-color: rgba(62,207,142,0.2); }
  .stat-card.red   { border-color: rgba(240,96,96,0.2); }
  .stat-card.blue  { border-color: rgba(77,166,255,0.2); }
  .stat-card.gold  { border-color: rgba(255,45,77,0.2); }
  .stat-label { font-size: 12px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.9px; margin-bottom: 14px; font-weight: 700; }
  .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 38px; letter-spacing: 1px; line-height: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .stat-card.green .stat-value { color: var(--green); }
  .stat-card.red .stat-value   { color: var(--red); }
  .stat-card.blue .stat-value  { color: var(--blue); }
  .stat-card.gold .stat-value  { color: var(--accent); }
  .stat-sub { font-size: 12px; color: var(--text2); margin-top: 8px; }

  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 18px; border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; text-decoration: none; white-space: nowrap; }
  .btn svg { width: 15px; height: 15px; }
  .btn-primary { background: var(--accent); color: #fff; box-shadow: var(--glow-accent); }
  .btn-primary:hover { background: var(--accent2); transform: translateY(-1px); }
  .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border2); }
  .btn-secondary:hover { background: var(--surface3); }
  .btn-success { background: rgba(62,207,142,0.12); color: var(--green); border: 1px solid rgba(62,207,142,0.25); }
  .btn-success:hover { background: rgba(62,207,142,0.22); }
  .btn-danger { background: rgba(240,96,96,0.1); color: var(--red); border: 1px solid rgba(240,96,96,0.2); }
  .btn-danger:hover { background: rgba(240,96,96,0.2); }
  .btn-info { background: rgba(77,166,255,0.1); color: var(--blue); border: 1px solid rgba(77,166,255,0.2); }
  .btn-info:hover { background: rgba(77,166,255,0.2); }
  .btn-whatsapp { background: #25d366; color: #fff; border: none; }
  .btn-whatsapp:hover { background: #20ba57; transform: translateY(-1px); }
  .btn-sm { padding: 6px 13px; font-size: 12px; }
  .btn-icon { padding: 7px; background: var(--surface2); border: 1px solid var(--border); color: var(--text2); border-radius: var(--radius-sm); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .btn-icon:hover { color: var(--text); background: var(--surface3); }
  .btn-icon.danger:hover { color: var(--red); background: rgba(240,96,96,0.1); border-color: rgba(240,96,96,0.3); }
  .btn-icon svg { width: 14px; height: 14px; }

  .input-group { display: flex; flex-direction: column; gap: 6px; }
  .input-label { font-size: 11.5px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.6px; }
  .input { background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius-sm); padding: 10px 13px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 13.5px; width: 100%; transition: border-color 0.15s; outline: none; }
  .input:focus { border-color: var(--accent); }
  .input::placeholder { color: var(--text2); }
  select.input { appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 30px; }
  textarea.input { resize: vertical; min-height: 80px; }

  .form-grid { display: grid; gap: 16px; }
  .form-grid-2 { grid-template-columns: 1fr 1fr; }
  .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px; }

  .margem-preview { background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .margem-item { display: flex; flex-direction: column; gap: 2px; }
  .margem-item-label { font-size: 10px; color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px; }
  .margem-item-value { font-family: 'Bebas Neue', sans-serif; font-size: 18px; }

  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 11px 16px; font-size: 10.5px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.7px; border-bottom: 1px solid var(--border); background: var(--surface); position: sticky; top: 0; z-index: 1; }
  td { padding: 13px 16px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,0.015); }

  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 600; }
  .badge-green  { background: rgba(62,207,142,0.12); color: var(--green); }
  .badge-red    { background: rgba(240,96,96,0.12); color: var(--red); }
  .badge-yellow { background: rgba(245,166,35,0.12); color: var(--yellow); }
  .badge-blue   { background: rgba(77,166,255,0.12); color: var(--blue); }
  .badge-gold   { background: rgba(255,45,77,0.12); color: var(--accent); }
  .badge-purple { background: rgba(167,139,250,0.12); color: #a78bfa; }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; animation: fadeIn 0.15s; }
  .modal { background: var(--surface); border: 1px solid var(--border2); border-radius: var(--radius); width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; animation: slideUp 0.2s cubic-bezier(.34,1.56,.64,1); }
  .modal-wide { max-width: 760px; }
  .modal-header { padding: 22px 24px 0; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 1px; }
  .modal-body { padding: 0 24px 24px; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes slideUp { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:none} }

  .login-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg); position:relative; overflow:hidden; }
  .login-bg { position:absolute; inset:0; pointer-events:none; }
  .login-blob { position:absolute; border-radius:50%; filter:blur(90px); opacity:0.18; }
  .login-error { background:rgba(240,96,96,0.1); border:1px solid rgba(240,96,96,0.3); border-radius:var(--radius-sm); padding:10px 14px; font-size:13px; color:var(--red); margin-bottom:16px; }
  .login-card { background:var(--surface); border:1px solid var(--border2); border-radius:16px; padding:44px 40px; width:100%; max-width:420px; position:relative; z-index:1; animation:slideUp 0.4s cubic-bezier(.34,1.56,.64,1); }
  .login-logo { display:flex; align-items:center; gap:14px; margin-bottom:28px; }
  .login-logo-img { width:56px; height:56px; border-radius:50%; background:transparent; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .login-logo-img img { width:100%; height:100%; object-fit:contain; }
  .login-logo-text h1 { font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:3px; color:var(--accent); line-height:1; }
  .login-logo-text p { font-size:12px; color:var(--text2); margin-top:2px; }

  .toast-container { position:fixed; bottom:24px; right:24px; z-index:999; display:flex; flex-direction:column; gap:8px; }
  .toast { background:var(--surface); border:1px solid var(--border2); border-radius:var(--radius-sm); padding:12px 16px; font-size:13px; min-width:260px; display:flex; align-items:center; gap:10px; animation:slideUp 0.25s cubic-bezier(.34,1.56,.64,1); box-shadow:0 8px 32px rgba(0,0,0,0.5); }
  .toast-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .toast.success .toast-dot { background:var(--green); }
  .toast.error .toast-dot { background:var(--red); }
  .toast.info .toast-dot { background:var(--blue); }

  .usuarios-grid { display: grid; gap: 12px; }
  .usuario-card { background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .usuario-card-top { display: flex; align-items: center; gap: 12px; }
  .usuario-avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0; }
  .usuario-info { flex: 1; min-width: 0; }
  .usuario-nome { font-size: 14px; font-weight: 700; color: var(--text); word-break: break-word; }
  .usuario-email { font-size: 12px; color: var(--text2); word-break: break-all; margin-top: 2px; }
  .usuario-role { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 99px; }
  .role-dono { background: rgba(255,45,77,0.15); color: var(--accent); }
  .role-func { background: rgba(77,166,255,0.12); color: var(--blue); }

  .sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:99; }
  .sidebar-overlay.visible { display:block; }
  .empty-state { padding:52px; text-align:center; color:var(--text2); }
  .empty-icon { font-size:42px; margin-bottom:12px; opacity:0.45; }
  .empty-text { font-size:14px; }
  .mobile-navbar { display: none; position: fixed; top: 0; left: 0; right: 0; height: 60px; background: var(--surface); border-bottom: 1px solid var(--border); z-index: 101; align-items: center; padding: 0 16px; gap: 12px; }
  .mobile-menu-btn { background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius-sm); padding: 8px; cursor: pointer; color: var(--text); display: flex; align-items: center; justify-content: center; }
  .mobile-logo { display: flex; align-items: center; gap: 10px; flex: 1; }
  .mobile-logo-img { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .mobile-logo-img img { width: 100%; height: 100%; object-fit: contain; }
  .mobile-logo-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 2px; color: var(--accent); line-height: 1; }
  .mobile-menu-btn svg { width:18px; height:18px; display:block; }
  .confirm-dialog { background:var(--surface); border:1px solid var(--border2); border-radius:var(--radius); padding:26px; max-width:420px; width:100%; }
  .confirm-title { font-family:'Bebas Neue',sans-serif; font-size:18px; letter-spacing:1px; margin-bottom:10px; }
  .confirm-text { font-size:13px; color:var(--text2); margin-bottom:22px; }
  .confirm-actions { display:flex; gap:10px; justify-content:flex-end; }
  .product-thumb { width:36px; height:36px; border-radius:8px; background:var(--surface3); display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; overflow:hidden; }
  .product-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .img-upload { display:flex; align-items:center; gap:14px; }
  .img-upload-preview { width:72px; height:72px; border-radius:10px; background:var(--surface3); border:1px solid var(--border2); display:flex; align-items:center; justify-content:center; font-size:24px; overflow:hidden; flex-shrink:0; }
  .img-upload-preview img { width:100%; height:100%; object-fit:cover; display:block; }
  .img-upload-actions { display:flex; flex-direction:column; gap:6px; }
  .img-upload-actions input[type=file] { display:none; }
  .img-upload-label { display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border-radius:var(--radius-sm); font-size:12.5px; font-weight:600; cursor:pointer; background:var(--surface2); border:1px solid var(--border2); color:var(--text); transition:all .15s; width:fit-content; }
  .img-upload-label:hover { background:var(--surface3); }
  .img-upload-remove { font-size:12px; color:var(--red); cursor:pointer; background:none; border:none; padding:0; text-align:left; width:fit-content; }
  .img-upload-remove:hover { text-decoration:underline; }

  .tags-selector { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  .tag-opt { padding: 5px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border2); background: var(--surface2); color: var(--text2); transition: all 0.15s; user-select: none; }
  .tag-opt:hover { border-color: var(--accent); color: var(--accent); }
  .tag-opt.selected { background: rgba(255,45,77,0.15); border-color: var(--accent); color: var(--accent); }

  .loading-screen { min-height:100vh; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:16px; background:var(--bg); }

  .splash-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); background: radial-gradient(circle at 50% 30%, #1a1a1a 0%, #0c0c0c 70%); }
  .splash-content { display: flex; flex-direction: column; align-items: center; gap: 18px; animation: splashIn 0.7s ease-out; }
  .splash-logo-wrap { width: 64px; height: 64px; border-radius: 50%; margin-top: -8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
  .splash-logo-wrap-solo { width: 168px; height: 168px; margin-top: 0; border-radius: 0; box-shadow: none; filter: drop-shadow(0 0 22px rgba(255,45,77,0.35)) drop-shadow(0 0 40px rgba(62,166,255,0.15)); }
  .splash-logo { width: 100%; height: 100%; object-fit: contain; }
  .splash-name { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 4px; color: var(--text); margin-top: 4px; }
  .splash-tagline { font-size: 10px; letter-spacing: 2px; color: var(--accent2); text-transform: uppercase; margin-top: -12px; }
  .splash-spinner { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border2); border-top-color: var(--accent); animation: spin 0.8s linear infinite; margin-top: 6px; }
  @keyframes splashIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .spinner { width:32px; height:32px; border:3px solid var(--border2); border-top-color:var(--accent); border-radius:50%; animation:spin 0.7s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }

  .produto-pai-row td { background: var(--surface); }
  .produto-pai-row:hover td { background: rgba(255,45,77,0.03) !important; }
  .produto-expand-btn { background: none; border: 1px solid var(--border2); border-radius: 6px; padding: 4px 8px; cursor: pointer; color: var(--text2); font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all 0.15s; white-space: nowrap; }
  .produto-expand-btn:hover { border-color: var(--accent); color: var(--accent); }
  .variante-row td { background: rgba(255,255,255,0.015); padding-top: 9px; padding-bottom: 9px; }
  .variante-row:hover td { background: rgba(255,255,255,0.03) !important; }
  .variante-indent { padding-left: 52px !important; }
  .variante-label { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text2); }
  .variante-label-badge { padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; background: rgba(77,166,255,0.1); color: var(--blue); border: 1px solid rgba(77,166,255,0.2); }

  .variante-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .variante-item { background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .variante-item-label { font-size: 13px; font-weight: 700; color: var(--text); flex: 1; min-width: 140px; }
  .variante-item-estoque { font-size: 12px; color: var(--text2); }
  .add-variante-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-top: 10px; }

  .variante-grade-section { margin-top: 14px; }
  .variante-grade-label { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; }
  .variante-grade-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .variante-chip { padding: 7px 16px; border-radius: 99px; font-size: 13px; font-weight: 700; border: 1.5px solid var(--border2); background: var(--surface2); color: var(--text2); cursor: pointer; transition: all 0.15s; user-select: none; position: relative; }
  .variante-chip:hover:not(.disabled) { border-color: var(--accent); color: var(--accent); }
  .variante-chip.active { border-color: var(--accent); background: rgba(255,45,77,0.12); color: var(--accent); }
  .variante-chip.active-cor { border-color: var(--blue); background: rgba(77,166,255,0.12); color: var(--blue); }
  .variante-chip.disabled { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }
  .variante-chip-estoque { position: absolute; top: -6px; right: -4px; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 99px; background: var(--yellow); color: #000; line-height: 1.4; }
  .variante-chip-estoque.zero { background: var(--red); color: #fff; }
  .variante-resultado { margin-top: 12px; padding: 10px 14px; border-radius: var(--radius-sm); background: rgba(255,45,77,0.07); border: 1px solid rgba(255,45,77,0.25); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .variante-resultado-nome { font-size: 13px; font-weight: 700; color: var(--accent); }

  .info-box { background: rgba(77,166,255,0.07); border: 1px solid rgba(77,166,255,0.2); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 12px; color: var(--text2); }
  .warn-box { background: rgba(245,166,35,0.07); border: 1px solid rgba(245,166,35,0.25); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 12px; color: var(--yellow); }

  .compra-card { background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius); padding: 16px 18px; display: flex; align-items: flex-start; gap: 14px; transition: box-shadow 0.15s; }
  .compra-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.25); }
  .compra-card-info { flex: 1; min-width: 0; }
  .compra-card-fornecedor { font-size: 14px; font-weight: 700; color: var(--text); }
  .compra-card-valor { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: var(--accent); margin-top: 2px; }
  .compra-card-meta { font-size: 12px; color: var(--text2); margin-top: 4px; }
  .compra-card-obs { font-size: 12px; color: var(--text2); margin-top: 6px; font-style: italic; border-left: 2px solid var(--border2); padding-left: 8px; }
  .compra-card-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
  .compras-pendentes-list { display: flex; flex-direction: column; gap: 10px; }

  /* ── CARRINHO DE COMPRAS ── */
  .cart-section { background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius); padding: 18px; margin-bottom: 20px; }
  .cart-section-title { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 1px; color: var(--text2); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .cart-add-row { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; align-items: flex-end; }
  .cart-item-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); margin-top: 8px; }
  .cart-item-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--text); }
  .cart-item-qty { font-size: 12px; color: var(--text2); padding: 3px 10px; background: var(--surface2); border-radius: 99px; }
  .cart-item-price { font-size: 13px; font-weight: 700; color: var(--accent); min-width: 90px; text-align: right; }
  .cart-total-row { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
  .cart-total-label { font-size: 13px; color: var(--text2); font-weight: 700; }
  .cart-total-value { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: var(--accent); }
  .cart-empty { text-align: center; padding: 22px; color: var(--text2); font-size: 13px; }

  @media (max-width: 1200px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .page { padding: 28px 28px; }
  }
  @media (max-width: 768px) {
    .sidebar { position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%); }
    .sidebar.open { transform:translateX(0); box-shadow:8px 0 40px rgba(0,0,0,0.5); }
    .sidebar-overlay { display:block; }
    .mobile-navbar { display: flex; }
    .page { padding:20px 16px; padding-top:80px; }
    .stats-grid { grid-template-columns: 1fr; }
    .stats-grid-3 { grid-template-columns: 1fr; }
    .form-grid-2, .form-grid-3 { grid-template-columns:1fr; }
    .cart-add-row { grid-template-columns: 1fr 1fr; }
    .stat-value { font-size: 42px; }
  }
  @media (max-width: 420px) {
    .stat-value { font-size: 36px; }
  }
`;

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    dashboard: <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>,
    sell: <><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" fill="currentColor"/></>,
    expense: <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" fill="currentColor"/>,
    stock: <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" fill="currentColor"/>,
    image: <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>,
    clients: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>,
    categories: <path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5S15.01 22 17.5 22s4.5-2.01 4.5-4.5S19.99 13 17.5 13zm0 7c-1.38 0-2.5-1.12-2.5-2.5S16.12 15 17.5 15s2.5 1.12 2.5 2.5S18.88 20 17.5 20zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z" fill="currentColor"/>,
    pdf: <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" fill="currentColor"/>,
    download: <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>,
    trash: <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>,
    edit: <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>,
    plus: <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>,
    menu: <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>,
    close: <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>,
    lock: <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" fill="currentColor"/>,
    eye: <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>,
    eyeoff: <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/>,
    warn: <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="currentColor"/>,
    check: <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>,
    sync: <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" fill="currentColor"/>,
    chevronDown: <path d="M7 10l5 5 5-5z" fill="currentColor"/>,
    chevronRight: <path d="M10 17l5-5-5-5v10z" fill="currentColor"/>,
    variant: <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" fill="currentColor"/>,
    cart: <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.9 18 9 18h12v-2H9.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.43 5H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>,
    inbox: <path d="M19 3H4.99C3.89 3 3 3.9 3 5L3 19c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.34 3-3 3s-3-1.34-3-3H4.99V5H19v10z" fill="currentColor"/>,
    handshake: <path d="M11 5L6 9H2v6h4l5 4V5zm7.54 1.46a7 7 0 0 1 0 9.9l-1.41-1.41a5 5 0 0 0 0-7.07l1.41-1.42zM15.71 8.3a3 3 0 0 1 0 4.24l-1.42-1.42a1 1 0 0 0 0-1.41L15.71 8.3z" fill="currentColor"/>,
    balanco: <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="currentColor"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      {icons[name] || null}
    </svg>
  );
};


// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
let toastCount = 0;
let setToastsGlobal = null;

function useToasts() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { setToastsGlobal = setToasts; }, []);
  return toasts;
}

function toast(msg, type = "success") {
  if (!setToastsGlobal) return;
  const id = ++toastCount;
  setToastsGlobal(p => [...p, { id, msg, type }]);
  setTimeout(() => setToastsGlobal(p => p.filter(t => t.id !== id)), 3500);
}

function ToastContainer() {
  const toasts = useToasts();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <div className="toast-dot" />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL / CONFIRM
// ─────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-icon" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, title, text, onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-dialog">
        <div className="confirm-title">{title}</div>
        <div className="confirm-text">{text}</div>
        <div className="confirm-actions">
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancelar</button>
          <button className={`btn btn-sm ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SPLASH
// ─────────────────────────────────────────────
function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo-wrap splash-logo-wrap-solo">
          <img src={logoImg} alt="LF Games" className="splash-logo splash-logo-big" />
        </div>
        <div className="splash-name">LF GAMES</div>
        <div className="splash-tagline">JOGUE. VENÇA. DIVIRTA-SE.</div>
        <div className="splash-spinner" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GERENCIAR USUÁRIOS
// ─────────────────────────────────────────────
function GerenciarUsuarios({ usuarioAtual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", cargo: "funcionario" });
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [confirmRemover, setConfirmRemover] = useState(null);
  const [modalSenha, setModalSenha] = useState(null);
  const [formSenha, setFormSenha] = useState({ senhaAtual: "", senhaNova: "", confirmar: "" });
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [showSenhas, setShowSenhas] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingUsers(false);
    });
    return unsub;
  }, []);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function setSenhaF(k, v) { setFormSenha(p => ({ ...p, [k]: v })); }

  async function criarUsuario(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim() || form.senha.length < 6)
      return toast("Preencha todos os campos. Senha mínima: 6 caracteres.", "error");
    setLoading(true);
    try {
      const resCriar = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${auth.app.options.apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email.trim(), password: form.senha, returnSecureToken: true }) }
      );
      const dataCriar = await resCriar.json();
      if (dataCriar.error) {
        if (dataCriar.error.message === "EMAIL_EXISTS") {
          const resSignin = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${auth.app.options.apiKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email.trim(), password: form.senha, returnSecureToken: true }) }
          );
          const dataSignin = await resSignin.json();
          if (dataSignin.error) { toast("E-mail já registrado com outra senha.", "error"); setLoading(false); return; }
          const localId = dataSignin.localId;
          const jaExiste = usuarios.find(u => u.uid === localId);
          if (jaExiste) { toast(`Este e-mail já está ativo como "${jaExiste.nome}".`, "error"); setLoading(false); return; }
          await setDoc(doc(db, "usuarios", localId), { uid: localId, nome: form.nome.trim(), email: form.email.trim(), cargo: form.cargo, criadoEm: new Date().toISOString(), criadoPor: usuarioAtual?.uid });
          toast(`Usuário ${form.nome} reativado! ✓`);
          setForm({ nome: "", email: "", senha: "", cargo: "funcionario" }); setModal(false); setLoading(false); return;
        }
        const msgs = { "WEAK_PASSWORD": "Senha fraca.", "INVALID_EMAIL": "E-mail inválido." };
        throw new Error(msgs[dataCriar.error.message] || dataCriar.error.message);
      }
      await setDoc(doc(db, "usuarios", dataCriar.localId), { uid: dataCriar.localId, nome: form.nome.trim(), email: form.email.trim(), cargo: form.cargo, criadoEm: new Date().toISOString(), criadoPor: usuarioAtual?.uid });
      toast(`Usuário ${form.nome} criado! ✓`);
      setForm({ nome: "", email: "", senha: "", cargo: "funcionario" }); setModal(false);
    } catch (err) { toast(err.message || "Erro ao criar usuário.", "error"); }
    finally { setLoading(false); }
  }

  async function alterarSenha(e) {
    e.preventDefault();
    if (!formSenha.senhaAtual) return toast("Informe a senha atual.", "error");
    if (formSenha.senhaNova.length < 6) return toast("Nova senha mínimo 6 caracteres.", "error");
    if (formSenha.senhaNova !== formSenha.confirmar) return toast("As senhas não conferem.", "error");
    setLoadingSenha(true);
    try {
      const resLogin = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${auth.app.options.apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: modalSenha.email, password: formSenha.senhaAtual, returnSecureToken: true }) }
      );
      const dataLogin = await resLogin.json();
      if (dataLogin.error) { const msgs = { "INVALID_PASSWORD": "Senha atual incorreta.", "INVALID_LOGIN_CREDENTIALS": "Senha atual incorreta." }; throw new Error(msgs[dataLogin.error.message] || "Senha atual incorreta."); }
      const resUpdate = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${auth.app.options.apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: dataLogin.idToken, password: formSenha.senhaNova, returnSecureToken: true }) }
      );
      const dataUpdate = await resUpdate.json();
      if (dataUpdate.error) throw new Error("Erro ao atualizar senha.");
      toast(`Senha de "${modalSenha.nome}" alterada! ✓`);
      setModalSenha(null); setFormSenha({ senhaAtual: "", senhaNova: "", confirmar: "" });
    } catch (err) { toast(err.message || "Erro ao alterar senha.", "error"); }
    finally { setLoadingSenha(false); }
  }

  async function confirmarRemover() {
    if (!confirmRemover) return;
    await deleteDoc(doc(db, "usuarios", confirmRemover.id));
    toast(`"${confirmRemover.nome}" removido.`);
    setConfirmRemover(null);
  }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Usuários</h1><p className="page-sub">Gerencie quem tem acesso ao sistema</p></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Icon name="plus" />Novo Usuário</button>
      </div>
      <div className="card"><div className="card-body">
        {loadingUsers
          ? <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>Carregando...</div>
          : usuarios.length === 0
            ? <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-text">Nenhum usuário</div></div>
            : <div className="usuarios-grid">
              {usuarios.map(u => (
                <div key={u.id} className="usuario-card">
                  <div className="usuario-card-top">
                    <div className="usuario-avatar" style={{ background: u.cargo === "dono" ? "rgba(255,45,77,0.15)" : "rgba(77,166,255,0.12)", color: u.cargo === "dono" ? "var(--accent)" : "var(--blue)" }}>
                      {(u.nome || "?")[0].toUpperCase()}
                    </div>
                    <div className="usuario-info">
                      <div className="usuario-nome">{u.nome}</div>
                      <div className="usuario-email">{u.email}</div>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <span className={`usuario-role ${u.cargo === "dono" ? "role-dono" : "role-func"}`} style={{ alignSelf: "flex-start" }}>
                      {u.cargo === "dono" ? "👑 Dono" : "👤 Funcionário"}
                    </span>
                    {u.uid === usuarioAtual?.uid
                      ? <span style={{ fontSize: 11, color: "var(--text2)", padding: "4px 8px", borderRadius: 99, background: "var(--surface3)", alignSelf: "flex-start" }}>Você</span>
                      : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn btn-sm btn-info" style={{ flex: 1 }} onClick={() => { setModalSenha(u); setFormSenha({ senhaAtual: "", senhaNova: "", confirmar: "" }); setShowSenhas(false); }}>🔑 Alterar Senha</button>
                        <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => setConfirmRemover({ id: u.id, uid: u.uid, nome: u.nome })}><Icon name="trash" size={13} />Remover</button>
                      </div>
                    }
                  </div>
                </div>
              ))}
            </div>
        }
      </div></div>

      <Modal open={modal} onClose={() => { setModal(false); setForm({ nome: "", email: "", senha: "", cargo: "funcionario" }); }} title="Novo Usuário">
        <form onSubmit={criarUsuario}>
          <div className="form-grid" style={{ gap: 14 }}>
            <div className="input-group"><label className="input-label">Nome</label><input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">E-mail</label><input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Senha</label><input className="input" type="password" value={form.senha} onChange={e => set("senha", e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
            <div className="input-group"><label className="input-label">Cargo</label>
              <select className="input" value={form.cargo} onChange={e => set("cargo", e.target.value)}>
                <option value="funcionario">Funcionário</option>
                <option value="dono">Dono / Admin</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Processando..." : "Criar"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!modalSenha} onClose={() => setModalSenha(null)} title={`Alterar Senha — ${modalSenha?.nome || ""}`}>
        <form onSubmit={alterarSenha}>
          <div className="form-grid" style={{ gap: 14 }}>
            <div className="input-group">
              <label className="input-label">Senha Atual</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showSenhas ? "text" : "password"} value={formSenha.senhaAtual} onChange={e => setSenhaF("senhaAtual", e.target.value)} style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowSenhas(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text2)", cursor: "pointer" }}><Icon name={showSenhas ? "eyeoff" : "eye"} size={16} /></button>
              </div>
            </div>
            <div className="input-group"><label className="input-label">Nova Senha</label><input className="input" type={showSenhas ? "text" : "password"} value={formSenha.senhaNova} onChange={e => setSenhaF("senhaNova", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Confirmar Nova Senha</label><input className="input" type={showSenhas ? "text" : "password"} value={formSenha.confirmar} onChange={e => setSenhaF("confirmar", e.target.value)} /></div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModalSenha(null)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loadingSenha}>{loadingSenha ? "Alterando..." : "Salvar"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmRemover} title="Remover Usuário?" text={`"${confirmRemover?.nome}" perderá o acesso.`} danger onConfirm={confirmarRemover} onCancel={() => setConfirmRemover(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// RELATÓRIO PDF — VERSÃO COMPLETA
// ─────────────────────────────────────────────
function RelatorioPDF({ dados }) {
  const transacoes = dados.transacoes || [];
  const produtos = dados.produtos || [];
  const variantesProduto = dados.variantesProduto || [];
  const compras = dados.compras || [];

  const [mes, setMes] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const transacoesFiltradas = useMemo(() =>
    transacoes.filter(t => t.data && t.data.startsWith(mes)).sort((a, b) => new Date(a.data) - new Date(b.data)),
    [transacoes, mes]);

  const vendasMes = useMemo(() => transacoesFiltradas.filter(t => t.tipo === "venda"), [transacoesFiltradas]);
  const despesasMesArr = useMemo(() => transacoesFiltradas.filter(t => t.tipo === "despesa"), [transacoesFiltradas]);
  const receitasMes = useMemo(() => vendasMes.reduce((s, t) => s + t.valor, 0), [vendasMes]);
  const despesasMes = useMemo(() => despesasMesArr.reduce((s, t) => s + t.valor, 0), [despesasMesArr]);
  const saldoMes = receitasMes - despesasMes;
  const qtdVendas = vendasMes.length;
  const ticketMedio = qtdVendas > 0 ? receitasMes / qtdVendas : 0;
  const maiorVenda = vendasMes.length > 0 ? Math.max(...vendasMes.map(t => t.valor)) : 0;
  const percentLucroDespesa = despesasMes > 0 ? ((saldoMes / despesasMes) * 100).toFixed(1) : receitasMes > 0 ? "∞" : "0.0";

  const comprasMes = useMemo(() => compras.filter(c => c.data && c.data.startsWith(mes)), [compras, mes]);
  const totalComprasMes = comprasMes.reduce((s, c) => s + c.valor, 0);
  const comprasPendentesMes = comprasMes.filter(c => c.status === "aguardando").length;

  // Vendas por dia (para gráfico)
  const [ano, mesNum] = mes.split("-");
  const diasNoMes = new Date(parseInt(ano), parseInt(mesNum), 0).getDate();
  const vendasPorDia = useMemo(() => {
    const map = {};
    for (let d = 1; d <= diasNoMes; d++) map[d] = 0;
    vendasMes.forEach(t => {
      const dia = parseInt(t.data.slice(8, 10));
      if (dia) map[dia] = (map[dia] || 0) + t.valor;
    });
    return map;
  }, [vendasMes, diasNoMes]);

  // Ranking de produtos mais vendidos
  const rankingProdutos = useMemo(() => {
    const map = {};
    vendasMes.forEach(t => {
      if (t.itens && Array.isArray(t.itens)) {
        t.itens.forEach(item => {
          const key = item.produtoId || item.label || "Outros";
          const nome = item.label || item.descricao || "Produto";
          if (!map[key]) map[key] = { nome, quantidade: 0, valor: 0 };
          map[key].quantidade += item.quantidade || 1;
          map[key].valor += item.subtotal || 0;
        });
      } else {
        const key = t.descricao || "Outros";
        if (!map[key]) map[key] = { nome: key, quantidade: 0, valor: 0 };
        map[key].quantidade += t.quantidade || 1;
        map[key].valor += t.valor || 0;
      }
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [vendasMes]);

  const produtosAbaixo = [];
  produtos.forEach(p => {
    const vars = variantesProduto.filter(v => v.produtoPaiId === p.id);
    if (vars.length > 0) { vars.forEach(v => { if (v.estoque <= (p.quantidadeMinima || 5)) produtosAbaixo.push({ nome: `${p.nome} (${v.label})`, estoque: v.estoque }); }); }
    else { if (p.quantidadeEstoque <= p.quantidadeMinima) produtosAbaixo.push({ nome: p.nome, estoque: p.quantidadeEstoque }); }
  });

  function gerarPDF() {
    const nomeMes = new Date(parseInt(ano), parseInt(mesNum) - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });
    const nomeMesCap = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    const pctColor = saldoMes >= 0 ? "#16a34a" : "#dc2626";
    const hoje = new Date().toLocaleDateString("pt-BR");

    // ── Gráfico SVG de barras diárias ──
    const maxVal = Math.max(...Object.values(vendasPorDia), 1);
    const barW = 14;
    const gap = 3;
    const chartH = 100;
    const chartW = diasNoMes * (barW + gap);
    const barsSVG = Object.entries(vendasPorDia).map(([dia, val]) => {
      const h = val > 0 ? Math.max(4, (val / maxVal) * chartH) : 2;
      const x = (parseInt(dia) - 1) * (barW + gap);
      const y = chartH - h;
      const cor = val > 0 ? "#e8b84b" : "#e5e7eb";
      return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="${cor}"/>${val > 0 ? `<text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="7" fill="#666">${formatBRL(val).replace("R$\u00a0","").replace("R$ ","")}</text>` : ""}`;
    }).join("");
    const labelsSVG = Object.keys(vendasPorDia).filter(d => parseInt(d) % 5 === 0 || parseInt(d) === 1).map(dia => {
      const x = (parseInt(dia) - 1) * (barW + gap) + barW / 2;
      return `<text x="${x}" y="${chartH + 12}" text-anchor="middle" font-size="8" fill="#888">${dia}</text>`;
    }).join("");
    const svgGrafico = `<svg xmlns="http://www.w3.org/2000/svg" width="${chartW}" height="${chartH + 20}" viewBox="0 0 ${chartW} ${chartH + 20}">${barsSVG}${labelsSVG}</svg>`;
    const svgBase64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgGrafico)))}`;

    // ── Ranking HTML ──
    const rankingLinhas = rankingProdutos.length === 0
      ? "<tr><td colspan='4' style='color:#aaa;text-align:center'>Nenhuma venda registrada com produtos</td></tr>"
      : rankingProdutos.map((p, i) => {
        const pct = receitasMes > 0 ? ((p.valor / receitasMes) * 100).toFixed(1) : "0.0";
        const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
        const barPct = rankingProdutos[0].valor > 0 ? (p.valor / rankingProdutos[0].valor * 100).toFixed(0) : 0;
        return `<tr>
          <td style="font-weight:700;font-size:13px">${medalha}</td>
          <td>
            <div style="font-weight:600;font-size:12px">${p.nome}</div>
            <div style="background:#f3f4f6;border-radius:99px;height:5px;margin-top:4px;overflow:hidden">
              <div style="background:#e8b84b;height:5px;width:${barPct}%;border-radius:99px"></div>
            </div>
          </td>
          <td style="text-align:center;font-weight:600;color:#374151">${p.quantidade} un.</td>
          <td style="text-align:right;font-weight:700;color:#16a34a">${formatBRL(p.valor)}<div style="font-size:10px;color:#9ca3af">${pct}% do total</div></td>
        </tr>`;
      }).join("");

    // ── Transações ──
    const linhasT = [...transacoesFiltradas].reverse().map(t =>
      `<tr><td style="color:#6b7280;white-space:nowrap">${formatData(t.data)}</td><td>${t.descricao || "—"}</td><td><span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:${t.tipo === "venda" ? "#dcfce7" : "#fee2e2"};color:${t.tipo === "venda" ? "#16a34a" : "#dc2626"}">${t.tipo === "venda" ? "Venda" : "Despesa"}</span></td><td style="text-align:right;font-weight:700;color:${t.tipo === "venda" ? "#16a34a" : "#dc2626"}">${formatBRL(t.valor)}</td></tr>`
    ).join("");

    // ── Estoque ──
    const linhasProd = produtos.map(p => {
      const vars = variantesProduto.filter(v => v.produtoPaiId === p.id);
      const estoqueTotal = vars.length > 0 ? vars.reduce((s, v) => s + (v.estoque || 0), 0) : p.quantidadeEstoque;
      const margem = p.precoCompra > 0 ? ((p.precoVenda - p.precoCompra) / p.precoCompra * 100).toFixed(0) : "—";
      const baixo = estoqueTotal <= p.quantidadeMinima;
      return `<tr style="background:${baixo ? "#fffbeb" : "#fff"}"><td style="font-weight:600">${p.nome}${p.sku ? `<div style="font-size:10px;color:#9ca3af">SKU: ${p.sku}</div>` : ""}</td><td style="text-align:center;font-weight:700;color:${baixo ? "#d97706" : "#16a34a"}">${estoqueTotal}</td><td style="text-align:right">${formatBRL(p.precoVenda)}</td><td style="text-align:center"><span style="padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;background:${margem !== "—" && parseInt(margem) > 30 ? "#dcfce7" : "#fef9c3"};color:${margem !== "—" && parseInt(margem) > 30 ? "#16a34a" : "#d97706"}">${margem}%</span></td></tr>`;
    }).join("");

    // ── Compras ──
    const linhasCompras = comprasMes.map(c =>
      `<tr><td style="color:#6b7280">${formatData(c.data)}</td><td>${c.fornecedor}</td><td style="text-align:right;font-weight:700;color:#e8b84b">${formatBRL(c.valor)}</td><td style="color:${c.status === "recebido" ? "#16a34a" : "#d97706"}">${c.status === "recebido" ? "✓ Recebido" : "⏳ Aguardando"}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório LF Games — ${nomeMesCap}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111827;background:#fff;padding:0}
  .page{padding:36px 40px}
  /* HEADER */
  .report-header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:20px;border-bottom:3px solid #e8b84b;margin-bottom:28px}
  .brand h1{font-size:30px;font-weight:900;letter-spacing:4px;color:#e8b84b;line-height:1}
  .brand p{font-size:12px;color:#6b7280;margin-top:3px;letter-spacing:1px}
  .report-meta{text-align:right}
  .report-meta .period{font-size:18px;font-weight:800;color:#111827;line-height:1}
  .report-meta .generated{font-size:11px;color:#9ca3af;margin-top:3px}
  /* SECTION */
  .section{margin-bottom:32px}
  .section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:7px;margin-bottom:16px;display:flex;align-items:center;gap:7px}
  .section-title span{font-size:15px}
  /* KPI GRID */
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:8px}
  .kpi{border-radius:10px;padding:16px 18px;border:1px solid #e5e7eb;position:relative;overflow:hidden}
  .kpi::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;border-radius:0 0 10px 10px}
  .kpi-green{border-color:#bbf7d0}.kpi-green::after{background:#16a34a}
  .kpi-red{border-color:#fecaca}.kpi-red::after{background:#dc2626}
  .kpi-blue{border-color:#bfdbfe}.kpi-blue::after{background:#2563eb}
  .kpi-gold{border-color:#fde68a}.kpi-gold::after{background:#e8b84b}
  .kpi-purple{border-color:#e9d5ff}.kpi-purple::after{background:#7c3aed}
  .kpi-teal{border-color:#99f6e4}.kpi-teal::after{background:#0d9488}
  .kpi-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;margin-bottom:8px}
  .kpi-value{font-size:22px;font-weight:900;line-height:1;letter-spacing:-0.5px}
  .kpi-sub{font-size:10px;color:#9ca3af;margin-top:4px}
  .kpi-green .kpi-value{color:#16a34a}
  .kpi-red .kpi-value{color:#dc2626}
  .kpi-blue .kpi-value{color:#2563eb}
  .kpi-gold .kpi-value{color:#e8b84b}
  .kpi-purple .kpi-value{color:#7c3aed}
  .kpi-teal .kpi-value{color:#0d9488}
  /* CHART */
  .chart-wrap{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px}
  .chart-title{font-size:11px;font-weight:700;color:#374151;margin-bottom:12px}
  .chart-img{width:100%;overflow-x:auto}
  /* TABLE */
  table{width:100%;border-collapse:collapse}
  th{text-align:left;padding:9px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background:#f9fafb;border-bottom:2px solid #e5e7eb;color:#6b7280}
  td{padding:9px 12px;border-bottom:1px solid #f3f4f6;font-size:11px;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fafafa}
  .tfoot-row td{background:#f9fafb;font-weight:700;border-top:2px solid #e8b84b;font-size:12px}
  /* ALERT */
  .alert{border-radius:8px;padding:10px 14px;font-size:11px;margin-bottom:16px}
  .alert-warn{background:#fffbeb;border:1px solid #fbbf24;color:#92400e}
  /* FOOTER */
  .report-footer{margin-top:36px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af}
  /* TOC */
  .toc{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:28px}
  .toc-item{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;font-size:11px;color:#374151;font-weight:600}
  .toc-item span{font-size:16px;margin-right:6px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="report-header">
    <div class="brand">
      <h1>LF GAMES</h1>
      <p>Relatório Financeiro Mensal</p>
    </div>
    <div class="report-meta">
      <div class="period">${nomeMesCap}</div>
      <div class="generated">Gerado em ${hoje}</div>
    </div>
  </div>

  <!-- ÍNDICE -->
  <div class="toc">
    <div class="toc-item"><span>📊</span>Índice de Vendas</div>
    <div class="toc-item"><span>📈</span>Gráfico Diário</div>
    <div class="toc-item"><span>🏆</span>Produtos Mais Vendidos</div>
    <div class="toc-item"><span>💳</span>Transações</div>
    <div class="toc-item"><span>📦</span>Estoque Atual</div>
    <div class="toc-item"><span>🛒</span>Compras do Mês</div>
  </div>

  <!-- 1. ÍNDICE DE VENDAS -->
  <div class="section">
    <div class="section-title"><span>📊</span>1. Índice de Vendas — Resumo Geral</div>
    <div class="kpi-grid">
      <div class="kpi kpi-green">
        <div class="kpi-label">Total Vendido</div>
        <div class="kpi-value">${formatBRL(receitasMes)}</div>
        <div class="kpi-sub">receitas do mês</div>
      </div>
      <div class="kpi kpi-red">
        <div class="kpi-label">Total Despesas</div>
        <div class="kpi-value">${formatBRL(despesasMes)}</div>
        <div class="kpi-sub">gastos do mês</div>
      </div>
      <div class="kpi kpi-blue">
        <div class="kpi-label">Saldo Líquido</div>
        <div class="kpi-value" style="color:${pctColor}">${formatBRL(saldoMes)}</div>
        <div class="kpi-sub">${saldoMes >= 0 ? "lucro" : "prejuízo"}</div>
      </div>
      <div class="kpi kpi-gold">
        <div class="kpi-label">Lucro / Despesa</div>
        <div class="kpi-value" style="color:${pctColor}">${percentLucroDespesa}${percentLucroDespesa !== "∞" ? "%" : ""}</div>
        <div class="kpi-sub">índice de eficiência</div>
      </div>
    </div>
    <div class="kpi-grid" style="margin-top:12px">
      <div class="kpi kpi-teal">
        <div class="kpi-label">Nº de Vendas</div>
        <div class="kpi-value">${qtdVendas}</div>
        <div class="kpi-sub">transações de venda</div>
      </div>
      <div class="kpi kpi-purple">
        <div class="kpi-label">Ticket Médio</div>
        <div class="kpi-value">${formatBRL(ticketMedio)}</div>
        <div class="kpi-sub">por venda</div>
      </div>
      <div class="kpi kpi-gold">
        <div class="kpi-label">Maior Venda</div>
        <div class="kpi-value">${formatBRL(maiorVenda)}</div>
        <div class="kpi-sub">maior transação</div>
      </div>
      <div class="kpi kpi-blue">
        <div class="kpi-label">Compras</div>
        <div class="kpi-value" style="color:#7c3aed">${formatBRL(totalComprasMes)}</div>
        <div class="kpi-sub">${comprasMes.length} pedido${comprasMes.length !== 1 ? "s" : ""}${comprasPendentesMes > 0 ? ` · ${comprasPendentesMes} pendente${comprasPendentesMes !== 1 ? "s" : ""}` : ""}</div>
      </div>
    </div>
  </div>

  <!-- 2. GRÁFICO DIÁRIO -->
  <div class="section">
    <div class="section-title"><span>📈</span>2. Gráfico de Vendas — Por Dia</div>
    <div class="chart-wrap">
      <div class="chart-title">Receitas diárias em ${nomeMesCap} (R$)</div>
      <div class="chart-img">
        <img src="${svgBase64}" style="max-width:100%;height:auto" />
      </div>
      <div style="display:flex;gap:24px;margin-top:12px;font-size:10px;color:#6b7280">
        <span>🟡 Dias com vendas &nbsp;&nbsp; ⬜ Dias sem vendas</span>
        <span style="margin-left:auto">Total de dias com venda: <strong>${Object.values(vendasPorDia).filter(v => v > 0).length}</strong> de ${diasNoMes}</span>
      </div>
    </div>
  </div>

  <!-- 3. RANKING PRODUTOS -->
  <div class="section">
    <div class="section-title"><span>🏆</span>3. Produtos Mais Vendidos</div>
    ${rankingProdutos.length === 0
      ? "<p style='color:#aaa;font-size:12px'>Nenhuma venda com produtos vinculados neste período.</p>"
      : `<table>
          <thead><tr><th>#</th><th>Produto</th><th style="text-align:center">Quantidade</th><th style="text-align:right">Valor Total</th></tr></thead>
          <tbody>${rankingLinhas}</tbody>
          <tfoot><tr class="tfoot-row"><td colspan="2">Total (top ${rankingProdutos.length})</td><td style="text-align:center">${rankingProdutos.reduce((s, p) => s + p.quantidade, 0)} un.</td><td style="text-align:right;color:#16a34a">${formatBRL(rankingProdutos.reduce((s, p) => s + p.valor, 0))}</td></tr></tfoot>
        </table>`
    }
  </div>

  <!-- 4. TRANSAÇÕES -->
  <div class="section">
    <div class="section-title"><span>💳</span>4. Transações do Mês (${transacoesFiltradas.length})</div>
    ${produtosAbaixo.length > 0 ? `<div class="alert alert-warn">⚠️ Estoque crítico: ${produtosAbaixo.map(p => `<strong>${p.nome}</strong> (${p.estoque} un.)`).join(", ")}</div>` : ""}
    ${transacoesFiltradas.length === 0
      ? "<p style='color:#aaa;font-size:12px'>Nenhuma transação neste mês.</p>"
      : `<table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead>
          <tbody>${linhasT}</tbody>
          <tfoot>
            <tr class="tfoot-row"><td colspan="2">Receitas</td><td></td><td style="text-align:right;color:#16a34a">${formatBRL(receitasMes)}</td></tr>
            <tr class="tfoot-row"><td colspan="2">Despesas</td><td></td><td style="text-align:right;color:#dc2626">${formatBRL(despesasMes)}</td></tr>
          </tfoot>
        </table>`
    }
  </div>

  <!-- 5. ESTOQUE -->
  <div class="section">
    <div class="section-title"><span>📦</span>5. Estoque Atual (${produtos.length} produtos)</div>
    ${produtos.length === 0
      ? "<p style='color:#aaa;font-size:12px'>Nenhum produto cadastrado.</p>"
      : `<table>
          <thead><tr><th>Produto</th><th style="text-align:center">Estoque</th><th style="text-align:right">Preço Venda</th><th style="text-align:center">Margem</th></tr></thead>
          <tbody>${linhasProd}</tbody>
        </table>`
    }
  </div>

  <!-- 6. COMPRAS -->
  <div class="section">
    <div class="section-title"><span>🛒</span>6. Compras do Mês (${comprasMes.length})</div>
    ${comprasMes.length === 0
      ? "<p style='color:#aaa;font-size:12px'>Nenhuma compra neste mês.</p>"
      : `<table>
          <thead><tr><th>Data</th><th>Fornecedor</th><th style="text-align:right">Valor</th><th>Status</th></tr></thead>
          <tbody>${linhasCompras}</tbody>
          <tfoot><tr class="tfoot-row"><td colspan="2">Total</td><td style="text-align:right;color:#e8b84b">${formatBRL(totalComprasMes)}</td><td>${comprasPendentesMes > 0 ? `⏳ ${comprasPendentesMes} aguardando` : "✓ Todos recebidos"}</td></tr></tfoot>
        </table>`
    }
  </div>

  <!-- FOOTER -->
  <div class="report-footer">
    <span>LF Games — Sistema de Gestão</span>
    <span>Relatório referente a ${nomeMesCap}</span>
    <span>Gerado em ${hoje}</span>
  </div>

</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Relatório PDF</h1><p className="page-sub">Relatório financeiro completo com gráfico e ranking</p></div>
        <button className="btn btn-primary" onClick={gerarPDF}><Icon name="download" />Gerar e Imprimir PDF</button>
      </div>

      {/* Preview dos dados no app */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div className="input-group" style={{ minWidth: 200 }}>
              <label className="input-label">Mês de referência</label>
              <input className="input" type="month" value={mes} onChange={e => setMes(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingTop: 20 }}>
              <div style={{ fontSize: 13 }}><span style={{ color: "var(--text2)" }}>Receitas: </span><span style={{ color: "var(--green)", fontWeight: 700 }}>{formatBRL(receitasMes)}</span></div>
              <div style={{ fontSize: 13 }}><span style={{ color: "var(--text2)" }}>Despesas: </span><span style={{ color: "var(--red)", fontWeight: 700 }}>{formatBRL(despesasMes)}</span></div>
              <div style={{ fontSize: 13 }}><span style={{ color: "var(--text2)" }}>Saldo: </span><span style={{ color: saldoMes >= 0 ? "var(--blue)" : "var(--red)", fontWeight: 700 }}>{formatBRL(saldoMes)}</span></div>
              <div style={{ fontSize: 13 }}><span style={{ color: "var(--text2)" }}>Vendas: </span><span style={{ fontWeight: 700 }}>{qtdVendas}</span></div>
              <div style={{ fontSize: 13 }}><span style={{ color: "var(--text2)" }}>Ticket médio: </span><span style={{ color: "var(--accent)", fontWeight: 700 }}>{formatBRL(ticketMedio)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking preview */}
      {rankingProdutos.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ padding: "16px 20px 12px" }}><span className="card-title">🏆 Top Produtos do Mês</span></div>
          <div className="table-wrap">
            <table><thead><tr><th>#</th><th>Produto</th><th style={{ textAlign: "center" }}>Qtd</th><th style={{ textAlign: "right" }}>Valor</th></tr></thead>
              <tbody>{rankingProdutos.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: i === 0 ? "var(--accent)" : "var(--text2)" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}</td>
                  <td style={{ fontWeight: 600 }}>{p.nome}</td>
                  <td style={{ textAlign: "center", color: "var(--text2)" }}>{p.quantidade} un.</td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "var(--green)" }}>{formatBRL(p.valor)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ padding: "18px 20px 14px" }}><span className="card-title">Transações ({transacoesFiltradas.length})</span></div>
        <div className="table-wrap">
          {transacoesFiltradas.length === 0
            ? <div className="empty-state"><div className="empty-icon">📄</div><div className="empty-text">Nenhuma transação neste mês</div></div>
            : <table><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th style={{ textAlign: "right" }}>Valor</th></tr></thead>
              <tbody>{[...transacoesFiltradas].reverse().map(t => (
                <tr key={t.id}>
                  <td style={{ color: "var(--text2)", whiteSpace: "nowrap" }}>{formatData(t.data)}</td>
                  <td>{t.descricao}</td>
                  <td><span className={`badge ${t.tipo === "venda" ? "badge-green" : "badge-red"}`}>{t.tipo === "venda" ? "Venda" : "Despesa"}</span></td>
                  <td style={{ fontWeight: 700, color: t.tipo === "venda" ? "var(--green)" : "var(--red)", textAlign: "right" }}>{formatBRL(t.valor)}</td>
                </tr>
              ))}</tbody></table>
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BALANÇO DE ESTOQUE PDF  ← NOVO
// ─────────────────────────────────────────────
function gerarBalancoPDF(produtos, variantesProduto) {
  const dataHoje = new Date().toLocaleDateString("pt-BR");
  const horaHoje = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let totalPecas = 0;
  let totalCustoEstoque = 0;
  let totalValorVenda = 0;

  const linhasProdutos = produtos.map(p => {
    const vars = variantesProduto.filter(v => v.produtoPaiId === p.id);
    const temVars = vars.length > 0;
    const estoqueTotal = temVars ? vars.reduce((s, v) => s + (v.estoque || 0), 0) : p.quantidadeEstoque;
    const custoTotal = estoqueTotal * p.precoCompra;
    const valorVendaTotal = estoqueTotal * p.precoVenda;
    const margem = p.precoCompra > 0 ? ((p.precoVenda - p.precoCompra) / p.precoCompra * 100).toFixed(0) : "—";
    const baixo = estoqueTotal <= p.quantidadeMinima;

    totalPecas += estoqueTotal;
    totalCustoEstoque += custoTotal;
    totalValorVenda += valorVendaTotal;

    const varLinhas = temVars
      ? vars.map(v => `<tr style="background:#fafafa"><td style="padding-left:32px;font-size:10px;color:#666">↳ ${v.label}</td><td></td><td style="text-align:center;font-size:11px">${v.estoque}</td><td></td><td></td><td></td><td></td></tr>`).join("")
      : "";

    return `
      <tr style="background:${baixo ? "#fffbeb" : "#fff"}">
        <td style="font-weight:700">${p.nome}${p.sku ? `<br><span style="font-size:10px;color:#999">SKU: ${p.sku}</span>` : ""}</td>
        <td style="text-align:center">${temVars ? `<span style="font-size:10px;color:#666">${vars.length} var.</span>` : "—"}</td>
        <td style="text-align:center;font-weight:700;color:${baixo ? "#d97706" : "#16a34a"}">${estoqueTotal}</td>
        <td style="text-align:right">${formatBRL(p.precoCompra)}</td>
        <td style="text-align:right">${formatBRL(p.precoVenda)}</td>
        <td style="text-align:right;font-weight:600;color:#9333ea">${formatBRL(custoTotal)}</td>
        <td style="text-align:right;font-weight:600;color:#16a34a">${formatBRL(valorVendaTotal)}</td>
        <td style="text-align:center"><span style="background:${margem !== "—" && parseInt(margem) > 30 ? "#dcfce7" : margem !== "—" && parseInt(margem) > 10 ? "#fef9c3" : "#fee2e2"};color:${margem !== "—" && parseInt(margem) > 30 ? "#16a34a" : margem !== "—" && parseInt(margem) > 10 ? "#d97706" : "#dc2626"};padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">${margem}%</span></td>
      </tr>
      ${varLinhas}
    `;
  }).join("");

  const lucroEstoque = totalValorVenda - totalCustoEstoque;
  const margemGeral = totalCustoEstoque > 0 ? ((lucroEstoque / totalCustoEstoque) * 100).toFixed(1) : "0.0";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Balanço de Estoque — LF Games</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #e8b84b; }
  h1 { font-size: 28px; font-weight: 900; letter-spacing: 3px; color: #e8b84b; line-height: 1; }
  .sub { font-size: 13px; color: #666; margin-top: 4px; }
  .date { text-align: right; font-size: 11px; color: #666; }
  .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 24px; }
  .stat { padding: 16px; border-radius: 10px; border: 1px solid #e5e7eb; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 6px; font-weight: 700; }
  .stat-value { font-size: 22px; font-weight: 900; line-height: 1; }
  .stat-sub { font-size: 10px; color: #9ca3af; margin-top: 4px; }
  .green { color: #16a34a; } .red { color: #dc2626; } .blue { color: #2563eb; } .gold { color: #d97706; } .purple { color: #7c3aed; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 22px 0 10px; color: #374151; border-bottom: 2px solid #e8b84b; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 9px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; background: #f9fafb; border-bottom: 2px solid #e5e7eb; color: #6b7280; letter-spacing: 0.5px; }
  td { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; vertical-align: middle; }
  .total-row td { background: #f9fafb; font-weight: 700; border-top: 2px solid #e8b84b; font-size: 12px; }
  .aviso { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; font-size: 11px; color: #92400e; margin-bottom: 16px; }
  .footer { margin-top: 32px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>LF GAMES</h1>
    <div class="sub">Balanço de Estoque</div>
  </div>
  <div class="date">Gerado em: ${dataHoje} às ${horaHoje}</div>
</div>

<div class="stats">
  <div class="stat">
    <div class="stat-label">Total de Produtos</div>
    <div class="stat-value blue">${produtos.length}</div>
    <div class="stat-sub">itens cadastrados</div>
  </div>
  <div class="stat">
    <div class="stat-label">Peças em Estoque</div>
    <div class="stat-value green">${totalPecas}</div>
    <div class="stat-sub">unidades disponíveis</div>
  </div>
  <div class="stat">
    <div class="stat-label">Custo Total Estoque</div>
    <div class="stat-value purple">${formatBRL(totalCustoEstoque)}</div>
    <div class="stat-sub">valor investido</div>
  </div>
  <div class="stat">
    <div class="stat-label">Valor de Venda Total</div>
    <div class="stat-value green">${formatBRL(totalValorVenda)}</div>
    <div class="stat-sub">se vender tudo</div>
  </div>
</div>

<div class="stats" style="grid-template-columns:repeat(2,1fr)">
  <div class="stat">
    <div class="stat-label">Lucro Potencial</div>
    <div class="stat-value ${lucroEstoque >= 0 ? "green" : "red"}">${formatBRL(lucroEstoque)}</div>
    <div class="stat-sub">venda − custo</div>
  </div>
  <div class="stat">
    <div class="stat-label">Margem Geral</div>
    <div class="stat-value ${parseFloat(margemGeral) > 20 ? "green" : parseFloat(margemGeral) > 5 ? "gold" : "red"}">${margemGeral}%</div>
    <div class="stat-sub">margem média do estoque</div>
  </div>
</div>

<h2>📦 Produtos em Estoque (${produtos.length})</h2>
${produtos.length === 0 ? "<p style='color:#aaa;padding:20px 0'>Nenhum produto cadastrado.</p>" : `
<table>
  <thead>
    <tr>
      <th>Produto / SKU</th>
      <th style="text-align:center">Variantes</th>
      <th style="text-align:center">Qtd.</th>
      <th style="text-align:right">Pr. Compra</th>
      <th style="text-align:right">Pr. Venda</th>
      <th style="text-align:right">Custo Total</th>
      <th style="text-align:right">Valor Venda</th>
      <th style="text-align:center">Margem</th>
    </tr>
  </thead>
  <tbody>
    ${linhasProdutos}
    <tr class="total-row">
      <td colspan="2">TOTAL GERAL</td>
      <td style="text-align:center">${totalPecas} un.</td>
      <td></td>
      <td></td>
      <td style="text-align:right;color:#7c3aed">${formatBRL(totalCustoEstoque)}</td>
      <td style="text-align:right;color:#16a34a">${formatBRL(totalValorVenda)}</td>
      <td style="text-align:center;color:${lucroEstoque >= 0 ? "#16a34a" : "#dc2626"}">${margemGeral}%</td>
    </tr>
  </tbody>
</table>
`}
<div class="footer">LF Games Sistema de Gestão — Balanço gerado em ${dataHoje}</div>
</body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

// ─────────────────────────────────────────────
// ESTOQUE CRÍTICO CARD (colapsável)
// ─────────────────────────────────────────────
function EstoqueCriticoCard({ produtos }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 16, borderColor: "rgba(245,166,35,0.35)", background: "rgba(245,166,35,0.04)", overflow: "hidden" }}>
      <div
        onClick={() => setAberto(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--yellow)" }}>Estoque crítico</span>
          <span style={{
            marginLeft: 10, background: "rgba(245,166,35,0.18)", color: "var(--yellow)",
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(245,166,35,0.3)"
          }}>{produtos.length} iten{produtos.length !== 1 ? "s" : ""}</span>
        </div>
        <svg width={16} height={16} viewBox="0 0 24 24" style={{ color: "var(--text2)", flexShrink: 0, transition: "transform 0.2s", transform: aberto ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M7 10l5 5 5-5z" fill="currentColor"/>
        </svg>
      </div>
      {aberto && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid rgba(245,166,35,0.15)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px", paddingTop: 12 }}>
            {produtos.map((p, i) => (
              <span key={i} style={{
                background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)",
                color: "var(--text2)", fontSize: 12, padding: "4px 10px", borderRadius: 99
              }}>{p}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
function Dashboard({ dados }) {
  const transacoes = dados.transacoes || [];
  const compras = dados.compras || [];
  const encomendas = dados.encomendas || [];
  const fiados = dados.fiados || [];
  const hojeISO = hojeLocal();
  const [ocultar, setOcultar] = useState(false);

  const totalReceitas = transacoes.filter(t => t.tipo === "venda").reduce((s, t) => s + t.valor, 0);
  const totalDespesas = transacoes.filter(t => t.tipo === "despesa").reduce((s, t) => s + t.valor, 0);
  const saldo = totalReceitas - totalDespesas;
  const hojeCount = transacoes.filter(t => t.data && t.data.slice(0, 10) === hojeISO).length;

  const comprasPendentes = compras.filter(c => c.status === "aguardando");
  const totalPendente = comprasPendentes.reduce((s, c) => s + c.valor, 0);

  const encomendasAtivas = encomendas.filter(e => e.status !== "entregue");
  const encomendasAtrasadas = encomendasAtivas.filter(e => e.dataEntrega && e.dataEntrega < hojeISO);

  const fiadosPendentes = fiados.filter(f => f.status === "pendente");
  const totalFiado = fiadosPendentes.reduce((s, f) => s + f.valor, 0);

  const produtosAbaixo = [];
  (dados.produtos || []).forEach(p => {
    const vars = (dados.variantesProduto || []).filter(v => v.produtoPaiId === p.id);
    if (vars.length > 0) { vars.forEach(v => { if (v.estoque <= (p.quantidadeMinima || 5)) produtosAbaixo.push(`${p.nome} (${v.label})`); }); }
    else { if (p.quantidadeEstoque <= p.quantidadeMinima) produtosAbaixo.push(p.nome); }
  });

  const ultimas = [...transacoes].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 8);

  // Formata ou oculta valor
  const val = (v) => ocultar ? "••••••" : formatBRL(v);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Painel de Controle</h1><p className="page-sub">Visão geral do seu negócio em tempo real</p></div>
        <button
          className="btn btn-secondary"
          onClick={() => setOcultar(o => !o)}
          title={ocultar ? "Mostrar valores" : "Ocultar valores"}
          style={{ gap: 6 }}
        >
          <Icon name={ocultar ? "eye" : "eyeoff"} size={16} />
          {ocultar ? "Mostrar" : "Ocultar"}
        </button>
      </div>
      <div className="stats-grid">
        <div className="stat-card green"><div className="stat-label">💰 Receitas Totais</div><div className="stat-value">{val(totalReceitas)}</div></div>
        <div className="stat-card red"><div className="stat-label">📉 Despesas Totais</div><div className="stat-value">{val(totalDespesas)}</div></div>
        <div className={`stat-card ${saldo >= 0 ? "blue" : "red"}`}><div className="stat-label">🏆 Saldo Líquido</div><div className="stat-value">{val(saldo)}</div></div>
        <div className="stat-card gold"><div className="stat-label">🎮 Hoje</div><div className="stat-value">{hojeCount}</div><div className="stat-sub">Transações</div></div>
      </div>

      {produtosAbaixo.length > 0 && <EstoqueCriticoCard produtos={produtosAbaixo} />}

      {comprasPendentes.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.04)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 24 }}>🛒</div>
            <div><div style={{ fontWeight: 700, fontSize: 14, color: "#a78bfa" }}>{comprasPendentes.length} compra{comprasPendentes.length > 1 ? "s" : ""} aguardando recebimento</div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>Pendente: <strong style={{ color: "var(--accent)" }}>{formatBRL(totalPendente)}</strong></div></div>
          </div>
        </div>
      )}

      {encomendasAtivas.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: encomendasAtrasadas.length > 0 ? "rgba(240,96,96,0.3)" : "rgba(77,166,255,0.3)", background: encomendasAtrasadas.length > 0 ? "rgba(240,96,96,0.04)" : "rgba(77,166,255,0.04)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 24 }}>📦</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: encomendasAtrasadas.length > 0 ? "var(--red)" : "var(--blue)" }}>
                {encomendasAtivas.length} encomenda{encomendasAtivas.length > 1 ? "s" : ""} ativa{encomendasAtivas.length > 1 ? "s" : ""}
                {encomendasAtrasadas.length > 0 && ` — ${encomendasAtrasadas.length} atrasada${encomendasAtrasadas.length > 1 ? "s" : ""}!`}
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>{encomendasAtivas.map(e => e.cliente).join(", ")}</div>
            </div>
          </div>
        </div>
      )}

      {fiadosPendentes.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(240,96,96,0.3)", background: "rgba(240,96,96,0.04)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ fontSize: 24 }}>🤝</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--red)" }}>{fiadosPendentes.length} fiado{fiadosPendentes.length > 1 ? "s" : ""} em aberto</div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>Total a receber: <strong style={{ color: "var(--accent)" }}>{formatBRL(totalFiado)}</strong></div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ padding: "20px 20px 14px" }}><span className="card-title">Últimas Transações</span></div>
        <div className="table-wrap">
          {ultimas.length === 0
            ? <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-text">Nenhuma transação ainda</div></div>
            : <table><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th style={{ textAlign: "right" }}>Valor</th></tr></thead>
              <tbody>{ultimas.map(t => (
                <tr key={t.id}>
                  <td style={{ color: "var(--text2)", whiteSpace: "nowrap" }}>{formatData(t.data)}</td>
                  <td>{t.descricao}</td>
                  <td><span className={`badge ${t.tipo === "venda" ? "badge-green" : "badge-red"}`}>{t.tipo === "venda" ? "Venda" : "Despesa"}</span></td>
                  <td style={{ fontWeight: 700, color: t.tipo === "venda" ? "var(--green)" : "var(--red)", textAlign: "right", whiteSpace: "nowrap" }}>{formatBRL(t.valor)}</td>
                </tr>
              ))}</tbody></table>
          }
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SELETOR DE ITEM (produto + variante + qtd) usado no carrinho de venda
// ─────────────────────────────────────────────
function SeletorItemVenda({ dados, onAdicionarItem, estoqueReservado }) {
  const [produtoId, setProdutoId] = useState("");
  const [tamSel, setTamSel] = useState("");
  const [corSel, setCorSel] = useState("");
  const [quantidade, setQuantidade] = useState("1");

  const produtos = dados.produtos || [];
  const variantesProduto = dados.variantesProduto || [];

  const produtosDisponiveis = produtos.filter(p => {
    const vars = variantesProduto.filter(v => v.produtoPaiId === p.id);
    if (vars.length > 0) return vars.some(v => {
      const reservado = estoqueReservado[v.id] || 0;
      return (v.estoque - reservado) > 0;
    });
    const reservado = estoqueReservado[p.id] || 0;
    return (p.quantidadeEstoque - reservado) > 0;
  });

  const produtoSel = produtos.find(p => p.id === produtoId);
  const variantesDisp = useMemo(() => produtoId ? variantesProduto.filter(v => v.produtoPaiId === produtoId) : [], [produtoId, variantesProduto]);
  const temVariantes = variantesDisp.length > 0;

  const { tamanhos, coresParaTam } = useMemo(() => {
    if (!temVariantes) return { tamanhos: [], coresParaTam: {} };
    const tamSet = new Set();
    const coresMap = {};
    variantesDisp.forEach(v => {
      const partes = v.label.split("/").map(s => s.trim());
      if (partes.length >= 2) {
        const [tam, ...corParts] = partes; const cor = corParts.join("/");
        tamSet.add(tam);
        if (!coresMap[tam]) coresMap[tam] = [];
        if (!coresMap[tam].find(c => c.cor === cor)) coresMap[tam].push({ cor, variante: v });
      } else {
        tamSet.add(v.label); coresMap[v.label] = [{ cor: "", variante: v }];
      }
    });
    return { tamanhos: [...tamSet], coresParaTam: coresMap };
  }, [variantesDisp, temVariantes]);

  const varianteSel = useMemo(() => {
    if (!tamSel) return null;
    const opcoes = coresParaTam[tamSel] || [];
    if (opcoes.length === 1 && opcoes[0].cor === "") return opcoes[0].variante;
    if (!corSel) return null;
    return opcoes.find(o => o.cor === corSel)?.variante || null;
  }, [tamSel, corSel, coresParaTam]);

  const estoqueDisp = useMemo(() => {
    if (varianteSel) return varianteSel.estoque - (estoqueReservado[varianteSel.id] || 0);
    if (!temVariantes && produtoSel) return produtoSel.quantidadeEstoque - (estoqueReservado[produtoSel.id] || 0);
    return 0;
  }, [varianteSel, temVariantes, produtoSel, estoqueReservado]);

  const qtd = parseInt(quantidade) || 1;
  const precoUnit = produtoSel ? produtoSel.precoVenda : 0;
  const custoUnit = produtoSel ? produtoSel.precoCompra : 0;
  const subtotal = precoUnit * qtd;
  const lucroItem = (precoUnit - custoUnit) * qtd;

  function handleProduto(id) {
    setProdutoId(id); setTamSel(""); setCorSel(""); setQuantidade("1");
  }

  function podeAdicionar() {
    if (!produtoSel) return false;
    if (temVariantes && !varianteSel) return false;
    if (qtd < 1 || qtd > estoqueDisp) return false;
    return true;
  }

  function adicionar() {
    if (!podeAdicionar()) {
      if (!produtoSel) return toast("Selecione um produto", "error");
      if (temVariantes && !varianteSel) return toast("Selecione tamanho e cor", "error");
      if (qtd > estoqueDisp) return toast(`Estoque insuficiente! Disponível: ${estoqueDisp}`, "error");
      return;
    }
    const label = varianteSel ? `${produtoSel.nome} — ${varianteSel.label}` : produtoSel.nome;
    onAdicionarItem({
      id: uid(),
      produtoId: produtoSel.id,
      varianteId: varianteSel ? varianteSel.id : null,
      label,
      quantidade: qtd,
      precoUnit,
      custoUnit,
      subtotal: precoUnit * qtd,
    });
    // reset seletor
    setProdutoId(""); setTamSel(""); setCorSel(""); setQuantidade("1");
    toast("Item adicionado ao carrinho ✓");
  }

  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", padding: 18, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>
        ➕ Adicionar Item ao Carrinho
      </div>

      <div className="form-grid form-grid-2" style={{ marginBottom: temVariantes && produtoId ? 0 : 0 }}>
        <div className="input-group">
          <label className="input-label">Produto</label>
          <select className="input" value={produtoId} onChange={e => handleProduto(e.target.value)}>
            <option value="">Selecionar produto...</option>
            {produtosDisponiveis.map(p => {
              const vars = variantesProduto.filter(v => v.produtoPaiId === p.id);
              const est = vars.length > 0
                ? vars.reduce((s, v) => s + Math.max(0, v.estoque - (estoqueReservado[v.id] || 0)), 0)
                : Math.max(0, p.quantidadeEstoque - (estoqueReservado[p.id] || 0));
              return <option key={p.id} value={p.id}>{p.nome} (Estq: {est})</option>;
            })}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Quantidade {estoqueDisp > 0 ? `(máx: ${estoqueDisp})` : ""}</label>
          <input className="input" type="number" min="1" max={estoqueDisp || undefined}
            value={quantidade} onChange={e => setQuantidade(e.target.value)}
            style={qtd > estoqueDisp && estoqueDisp > 0 ? { borderColor: "var(--red)" } : {}} />
        </div>
      </div>

      {/* Seletor de variantes */}
      {produtoId && temVariantes && (
        <div className="variante-grade-section">
          <div className="variante-grade-label">Tamanho</div>
          <div className="variante-grade-chips">
            {tamanhos.map(tam => {
              const opcoes = coresParaTam[tam] || [];
              const estTam = opcoes.reduce((s, o) => s + Math.max(0, o.variante.estoque - (estoqueReservado[o.variante.id] || 0)), 0);
              return (
                <div key={tam} className={`variante-chip ${tamSel === tam ? "active" : ""} ${estTam === 0 ? "disabled" : ""}`}
                  onClick={() => estTam > 0 && (setTamSel(tam), setCorSel(""))}>
                  {tam}
                  {estTam <= 5 && estTam > 0 && <span className="variante-chip-estoque">{estTam}</span>}
                  {estTam === 0 && <span className="variante-chip-estoque zero">0</span>}
                </div>
              );
            })}
          </div>
          {tamSel && coresParaTam[tamSel]?.[0]?.cor !== "" && (
            <div style={{ marginTop: 12 }}>
              <div className="variante-grade-label">Cor</div>
              <div className="variante-grade-chips">
                {(coresParaTam[tamSel] || []).map(({ cor, variante: v }) => {
                  const estV = Math.max(0, v.estoque - (estoqueReservado[v.id] || 0));
                  return (
                    <div key={cor} className={`variante-chip ${corSel === cor ? "active-cor" : ""} ${estV === 0 ? "disabled" : ""}`}
                      onClick={() => estV > 0 && setCorSel(cor)}>
                      {cor}
                      {estV <= 5 && estV > 0 && <span className="variante-chip-estoque">{estV}</span>}
                      {estV === 0 && <span className="variante-chip-estoque zero">0</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {varianteSel && (
            <div className="variante-resultado" style={{ marginTop: 10 }}>
              <span className="variante-resultado-nome">✓ {varianteSel.label}</span>
              <span className={`badge ${estoqueDisp <= 5 ? "badge-yellow" : "badge-green"}`}>{estoqueDisp} un. disponíveis</span>
            </div>
          )}
        </div>
      )}

      {/* Preview margem */}
      {produtoSel && subtotal > 0 && (!temVariantes || varianteSel) && (
        <div className="margem-preview" style={{ marginTop: 14 }}>
          <div className="margem-item"><span className="margem-item-label">Unit.</span><span className="margem-item-value" style={{ color: "var(--green)" }}>{formatBRL(precoUnit)}</span></div>
          <div style={{ color: "var(--border2)", fontSize: 18 }}>×{qtd}</div>
          <div className="margem-item"><span className="margem-item-label">Subtotal</span><span className="margem-item-value" style={{ color: "var(--green)" }}>{formatBRL(subtotal)}</span></div>
          <div style={{ color: "var(--border2)", fontSize: 18 }}>→</div>
          <div className="margem-item"><span className="margem-item-label">Lucro</span><span className="margem-item-value" style={{ color: lucroItem >= 0 ? "var(--green)" : "var(--red)" }}>{formatBRL(lucroItem)}</span></div>
        </div>
      )}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-success" onClick={adicionar} disabled={!podeAdicionar()}>
          <Icon name="plus" />Adicionar ao Carrinho
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CARRINHO DE VENDA
// ─────────────────────────────────────────────
function CarrinhoVenda({ dados, onSalvar, onCancelar }) {
  const [itens, setItens] = useState([]);
  const [meta, setMeta] = useState({ cliente: "", data: hojeLocal(), categoria: "", observacoes: "" });

  const categorias = (dados.categorias || []).filter(c => c.tipo === "receita");

  // controla estoque já reservado pelo carrinho para não deixar adicionar mais do que tem
  const estoqueReservado = useMemo(() => {
    const map = {};
    itens.forEach(i => {
      const key = i.varianteId || i.produtoId;
      map[key] = (map[key] || 0) + i.quantidade;
    });
    return map;
  }, [itens]);

  const totalCarrinho = itens.reduce((s, i) => s + i.subtotal, 0);
  const totalCusto = itens.reduce((s, i) => s + i.custoUnit * i.quantidade, 0);
  const totalLucro = totalCarrinho - totalCusto;
  const margemGeral = totalCusto > 0 ? (totalLucro / totalCusto * 100) : 0;

  function removerItem(id) { setItens(p => p.filter(i => i.id !== id)); }

  function fecharVenda() {
    if (itens.length === 0) return toast("Adicione pelo menos 1 item", "error");
    // gera um payload por item — a função onSalvar receberá array
    const descricaoGeral = itens.map(i => `${i.label} (${i.quantidade}x)`).join(", ");
    onSalvar({
      itens,
      descricao: descricaoGeral,
      valor: totalCarrinho,
      cliente: meta.cliente,
      categoria: meta.categoria,
      data: meta.data || hojeLocal(),
      observacoes: meta.observacoes,
    });
  }

  return (
    <div>
      {/* Seletor de item */}
      <SeletorItemVenda dados={dados} onAdicionarItem={item => setItens(p => [...p, item])} estoqueReservado={estoqueReservado} />

      {/* Carrinho */}
      <div className="cart-section">
        <div className="cart-section-title">🛒 Carrinho ({itens.length} {itens.length === 1 ? "item" : "itens"})</div>
        {itens.length === 0
          ? <div className="cart-empty">Nenhum item ainda. Selecione um produto acima e clique em <strong>Adicionar ao Carrinho</strong>.</div>
          : <>
            {itens.map(i => (
              <div key={i.id} className="cart-item-row">
                <span className="cart-item-name">{i.label}</span>
                <span className="cart-item-qty">{i.quantidade}x {formatBRL(i.precoUnit)}</span>
                <span className="cart-item-price">{formatBRL(i.subtotal)}</span>
                <button className="btn-icon danger" onClick={() => removerItem(i.id)}><Icon name="trash" /></button>
              </div>
            ))}
            <div className="cart-total-row">
              <div>
                <div className="cart-total-label">Total da Venda</div>
                {totalCusto > 0 && (
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
                    Lucro: <span style={{ color: totalLucro >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{formatBRL(totalLucro)}</span>
                    <span className={`badge ${margemGeral > 30 ? "badge-green" : margemGeral > 10 ? "badge-gold" : "badge-red"}`} style={{ marginLeft: 8, fontSize: 11 }}>{margemGeral.toFixed(0)}%</span>
                  </div>
                )}
              </div>
              <span className="cart-total-value">{formatBRL(totalCarrinho)}</span>
            </div>
          </>
        }
      </div>

      {/* Dados gerais da venda */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ padding: "16px 20px 12px" }}><span className="card-title">Dados da Venda</span></div>
        <div className="card-body">
          <div className="form-grid form-grid-2">
            <div className="input-group">
              <label className="input-label">Cliente</label>
              <select className="input" value={meta.cliente} onChange={e => setMeta(p => ({ ...p, cliente: e.target.value }))}>
                <option value="">Nenhum</option>
                {(dados.clientes || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Data</label>
              <input className="input" type="date" value={meta.data} onChange={e => setMeta(p => ({ ...p, data: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Categoria</label>
              <select className="input" value={meta.categoria} onChange={e => setMeta(p => ({ ...p, categoria: e.target.value }))}>
                <option value="">Selecione...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Observações</label>
              <input className="input" placeholder="Opcional..." value={meta.observacoes} onChange={e => setMeta(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        {onCancelar && <button className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>}
        <button className="btn btn-success" onClick={fecharVenda} disabled={itens.length === 0}>
          <Icon name="check" />
          Finalizar Venda {itens.length > 0 && `— ${formatBRL(totalCarrinho)}`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FORM TRANSAÇÃO (despesas — mantido simples)
// ─────────────────────────────────────────────
function FormTransacao({ tipo, dados, onSalvar, onCancelar }) {
  const [form, setForm] = useState({ descricao: "", valor: "", categoria: "", data: hojeLocal(), observacoes: "" });
  const categorias = (dados.categorias || []).filter(c => c.tipo === "despesa");
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function submit(e) {
    e.preventDefault();
    if (!form.descricao.trim()) return toast("Preencha a descrição", "error");
    if (!form.valor || parseFloat(form.valor) <= 0) return toast("Valor inválido", "error");
    onSalvar({ tipo, descricao: form.descricao, valor: parseFloat(form.valor), categoria: form.categoria || "", data: form.data || hojeLocal(), observacoes: form.observacoes || "", quantidade: 1 });
  }
  return (
    <form onSubmit={submit}>
      <div className="form-grid form-grid-2" style={{ marginBottom: 14 }}>
        <div className="input-group"><label className="input-label">Descrição *</label><input className="input" placeholder="Ex: Aluguel, Luz..." value={form.descricao} onChange={e => set("descricao", e.target.value)} /></div>
        <div className="input-group"><label className="input-label">Valor (R$) *</label><input className="input" type="number" step="0.01" min="0" value={form.valor} onChange={e => set("valor", e.target.value)} /></div>
        <div className="input-group">
          <label className="input-label">Categoria</label>
          <select className="input" value={form.categoria} onChange={e => set("categoria", e.target.value)}>
            <option value="">Selecione...</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="input-group"><label className="input-label">Data</label><input className="input" type="date" value={form.data} onChange={e => set("data", e.target.value)} /></div>
        <div className="input-group" style={{ gridColumn: "1 / -1" }}><label className="input-label">Observações</label><textarea className="input" value={form.observacoes} onChange={e => set("observacoes", e.target.value)} style={{ minHeight: 60 }} /></div>
      </div>
      <div className="form-actions">
        {onCancelar && <button type="button" className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>}
        <button type="submit" className="btn btn-danger"><Icon name="expense" />Registrar Despesa</button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────
// TRANSAÇÕES
// ─────────────────────────────────────────────
function Transacoes({ dados, onRemover }) {
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const transacoes = useMemo(() => {
    let list = [...(dados.transacoes || [])].sort((a, b) => new Date(b.data) - new Date(a.data));
    if (filtro !== "todos") list = list.filter(t => t.tipo === filtro);
    if (busca) list = list.filter(t => t.descricao.toLowerCase().includes(busca.toLowerCase()));
    return list;
  }, [dados.transacoes, filtro, busca]);

  function nomeCliente(id) {
    if (!id) return "";
    const found = (dados.clientes || []).find(x => x.id === id);
    return found ? found.nome : id;
  }

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Transações</h1><p className="page-sub">Histórico completo</p></div></div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input className="input" style={{ maxWidth: 260 }} placeholder="🔍 Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        {["todos", "venda", "despesa"].map(f => (
          <button key={f} className={`btn btn-sm ${filtro === f ? "btn-primary" : "btn-secondary"}`} onClick={() => setFiltro(f)}>
            {f === "todos" ? "Todos" : f === "venda" ? "Vendas" : "Despesas"}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="table-wrap">
          {transacoes.length === 0
            ? <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-text">Nenhuma transação</div></div>
            : <table><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Cliente</th><th style={{ textAlign: "right" }}>Valor</th><th></th></tr></thead>
              <tbody>{transacoes.map(t => (
                <tr key={t.id}>
                  <td style={{ color: "var(--text2)", whiteSpace: "nowrap" }}>{formatData(t.data)}</td>
                  <td>{t.descricao}{t.observacoes && <div style={{ fontSize: 11, color: "var(--text2)" }}>{t.observacoes}</div>}</td>
                  <td><span className={`badge ${t.tipo === "venda" ? "badge-green" : "badge-red"}`}>{t.tipo === "venda" ? "Venda" : "Despesa"}</span></td>
                  <td style={{ color: "var(--text2)" }}>{nomeCliente(t.cliente)}</td>
                  <td style={{ fontWeight: 700, color: t.tipo === "venda" ? "var(--green)" : "var(--red)", textAlign: "right", whiteSpace: "nowrap" }}>{formatBRL(t.valor)}</td>
                  <td><button className="btn-icon danger" onClick={() => setConfirmId(t.id)}><Icon name="trash" /></button></td>
                </tr>
              ))}</tbody></table>
          }
        </div>
      </div>
      <ConfirmDialog open={!!confirmId} title="Remover Transação?" text="Esta ação não pode ser desfeita." danger
        onConfirm={() => { onRemover(confirmId); setConfirmId(null); toast("Transação removida"); }}
        onCancel={() => setConfirmId(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// ESTOQUE  (com botão Balanço PDF)
// ─────────────────────────────────────────────
function Estoque({ dados, onAdicionar, onRemover, onAtualizar, onAdicionarVariante, onRemoverVariante, onAtualizarVariante }) {
  const [modal, setModal] = useState(false);
  const [modalVariantes, setModalVariantes] = useState(null);
  const [editando, setEditando] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [expandidos, setExpandidos] = useState({});
  const [form, setForm] = useState({ nome: "", descricao: "", precoCompra: "", precoVenda: "", quantidadeEstoque: "", quantidadeMinima: "5", imagem: "", categoria: "", console: "", marca: "", condicao: "Novo", fornecedor: "", linkML: "", destaque: false });
  const fornecedoresCad = dados.fornecedores || [];
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [novaVariante, setNovaVariante] = useState({ label: "", estoque: "" });
  const [editandoVariante, setEditandoVariante] = useState(null);

  const produtos = dados.produtos || [];
  const variantesProduto = dados.variantesProduto || [];
  const categoriasDisponiveis = useMemo(() => {
    const usadas = produtos.map(p => p.categoria).filter(Boolean);
    return [...new Set([...CATEGORIAS_PRODUTO, ...usadas])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [produtos]);
  const consolesDisponiveis = useMemo(() => {
    const usados = produtos.map(p => p.console).filter(Boolean);
    return [...new Set([...CONSOLES_PRODUTO, ...usados])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [produtos]);
  const pc = parseFloat(form.precoCompra) || 0;
  const pv = parseFloat(form.precoVenda) || 0;
  const margemForm = pc > 0 && pv > 0 ? ((pv - pc) / pc * 100) : null;

  // Totais para exibição no cabeçalho
  const totalPecas = produtos.reduce((s, p) => {
    const vars = variantesProduto.filter(v => v.produtoPaiId === p.id);
    return s + (vars.length > 0 ? vars.reduce((a, v) => a + (v.estoque || 0), 0) : p.quantidadeEstoque);
  }, 0);
  const totalCusto = produtos.reduce((s, p) => {
    const vars = variantesProduto.filter(v => v.produtoPaiId === p.id);
    const est = vars.length > 0 ? vars.reduce((a, v) => a + (v.estoque || 0), 0) : p.quantidadeEstoque;
    return s + est * p.precoCompra;
  }, 0);
  const totalVenda = produtos.reduce((s, p) => {
    const vars = variantesProduto.filter(v => v.produtoPaiId === p.id);
    const est = vars.length > 0 ? vars.reduce((a, v) => a + (v.estoque || 0), 0) : p.quantidadeEstoque;
    return s + est * p.precoVenda;
  }, 0);

  function abrirModal(p = null) {
    if (p) { setEditando(p.id); setForm({ nome: p.nome, descricao: p.descricao || "", precoCompra: p.precoCompra, precoVenda: p.precoVenda, quantidadeEstoque: p.quantidadeEstoque, quantidadeMinima: p.quantidadeMinima, imagem: p.imagem || "", categoria: p.categoria || "", console: p.console || "", marca: p.marca || "", condicao: p.condicao || "Novo", fornecedor: p.fornecedor || "", linkML: p.linkML || "", destaque: !!p.destaque }); }
    else { setEditando(null); setForm({ nome: "", descricao: "", precoCompra: "", precoVenda: "", quantidadeEstoque: "", quantidadeMinima: "5", imagem: "", categoria: "", console: "", marca: "", condicao: "Novo", fornecedor: "", linkML: "", destaque: false }); }
    setModal(true);
  }

  async function selecionarImagem(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEnviandoImagem(true);
    try {
      const base64 = await lerImagemComoBase64(file);
      set("imagem", base64);
    } catch {
      toast("Não foi possível carregar essa imagem", "error");
    } finally {
      setEnviandoImagem(false);
    }
  }

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function toggleExpand(id) { setExpandidos(p => ({ ...p, [id]: !p[id] })); }

  function submit(e) {
    e.preventDefault();
    if (!form.nome.trim()) return toast("Preencha o nome", "error");
    if (!form.precoVenda || parseFloat(form.precoVenda) <= 0) return toast("Preço de venda inválido", "error");
    const d = { nome: form.nome, descricao: form.descricao, precoCompra: parseFloat(form.precoCompra) || 0, precoVenda: parseFloat(form.precoVenda), quantidadeEstoque: parseInt(form.quantidadeEstoque) || 0, quantidadeMinima: parseInt(form.quantidadeMinima) || 5, imagem: form.imagem || "", categoria: form.categoria || "", console: form.console || "", marca: form.marca || "", condicao: form.condicao || "Novo", fornecedor: form.fornecedor || "", linkML: form.linkML || "", destaque: !!form.destaque };
    if (editando) { onAtualizar(editando, d); toast("Produto atualizado"); }
    else { onAdicionar(d); toast("Produto adicionado"); }
    setModal(false);
  }

  async function salvarVariante(e) {
    e.preventDefault();
    if (!novaVariante.label.trim()) return toast("Informe o label da variante", "error");
    await onAdicionarVariante({ produtoPaiId: modalVariantes.id, label: novaVariante.label.trim(), estoque: parseInt(novaVariante.estoque) || 0 });
    setNovaVariante({ label: "", estoque: "" }); toast("Variante adicionada ✓");
  }

  async function salvarEdicaoVariante(e) {
    e.preventDefault();
    if (!editandoVariante) return;
    await onAtualizarVariante(editandoVariante.id, { label: editandoVariante.label, estoque: parseInt(editandoVariante.estoque) || 0 });
    setEditandoVariante(null); toast("Variante atualizada ✓");
  }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Estoque</h1><p className="page-sub">Gerencie produtos e variantes</p></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* ── BOTÃO BALANÇO PDF ── */}
          <button className="btn btn-info" onClick={() => gerarBalancoPDF(produtos, variantesProduto)}>
            <Icon name="balanco" />Balanço PDF
          </button>
          <button className="btn btn-primary" onClick={() => abrirModal()}><Icon name="plus" /> Novo Produto</button>
        </div>
      </div>

      {/* Resumo rápido do estoque */}
      {produtos.length > 0 && (
        <div className="stats-grid-3">
          <div className="stat-card blue">
            <div className="stat-label">Total de Peças</div>
            <div className="stat-value">{totalPecas}</div>
            <div className="stat-sub">unidades em estoque</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Custo do Estoque</div>
            <div className="stat-value">{formatBRL(totalCusto)}</div>
            <div className="stat-sub">valor investido</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Valor de Venda</div>
            <div className="stat-value">{formatBRL(totalVenda)}</div>
            <div className="stat-sub">potencial de receita</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          {produtos.length === 0
            ? <div className="empty-state"><div className="empty-icon">📦</div><div className="empty-text">Nenhum produto cadastrado</div></div>
            : <table>
              <thead><tr><th>Produto</th><th>Categoria</th><th>Console</th><th>Condição</th><th>Compra</th><th>Venda</th><th>Estoque</th><th>Margem</th><th></th></tr></thead>
              <tbody>
                {produtos.map(p => {
                  const vars = variantesProduto.filter(v => v.produtoPaiId === p.id);
                  const temVars = vars.length > 0;
                  const estoqueTotal = temVars ? vars.reduce((s, v) => s + (v.estoque || 0), 0) : p.quantidadeEstoque;
                  const baixo = estoqueTotal <= p.quantidadeMinima;
                  const margem = p.precoCompra > 0 ? ((p.precoVenda - p.precoCompra) / p.precoCompra * 100) : 0;
                  const expandido = expandidos[p.id];
                  return [
                    <tr key={p.id} className="produto-pai-row">
                      <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="product-thumb">{p.imagem ? <img src={p.imagem} alt={p.nome} /> : "🎮"}</div><div><div style={{ fontWeight: 700 }}>{p.nome}</div>{p.descricao && <div style={{ fontSize: 11, color: "var(--text2)" }}>{p.descricao}</div>}</div></div></td>
                      <td style={{ fontSize: 12 }}>{p.categoria || <span style={{ color: "var(--text2)" }}>—</span>}</td>
                      <td style={{ color: "var(--text2)", fontSize: 12 }}>{p.console || "—"}</td>
                      <td>{p.condicao ? <span className={`badge ${corCondicao(p.condicao)}`}>{p.condicao}</span> : <span style={{ color: "var(--text2)" }}>—</span>}</td>
                      <td>{formatBRL(p.precoCompra)}</td>
                      <td style={{ fontWeight: 700 }}>{formatBRL(p.precoVenda)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span className={`badge ${baixo ? "badge-yellow" : "badge-green"}`}>{estoqueTotal} un.</span>
                          {baixo && <span style={{ fontSize: 11, color: "var(--yellow)" }}>⚠ mín: {p.quantidadeMinima}</span>}
                          {temVars && <button className="produto-expand-btn" onClick={() => toggleExpand(p.id)}><Icon name={expandido ? "chevronDown" : "chevronRight"} size={12} />{vars.length} variante{vars.length !== 1 ? "s" : ""}</button>}
                        </div>
                      </td>
                      <td><span className={`badge ${margem > 30 ? "badge-green" : margem > 10 ? "badge-gold" : "badge-red"}`}>{margem.toFixed(0)}%</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn-icon" title="Gerenciar Variantes" onClick={() => { setModalVariantes(p); setNovaVariante({ label: "", estoque: "" }); setEditandoVariante(null); }} style={{ color: "var(--blue)", borderColor: "rgba(77,166,255,0.3)" }}><Icon name="variant" /></button>
                          <button className="btn-icon" onClick={() => abrirModal(p)}><Icon name="edit" /></button>
                          <button className="btn-icon danger" onClick={() => setConfirmId(p.id)}><Icon name="trash" /></button>
                        </div>
                      </td>
                    </tr>,
                    ...(temVars && expandido ? vars.map(v => {
                      const vBaixo = v.estoque <= (p.quantidadeMinima || 5);
                      return (
                        <tr key={`var-${v.id}`} className="variante-row">
                          <td className="variante-indent" colSpan={1}><div className="variante-label"><span style={{ color: "var(--text2)", fontSize: 16 }}>↳</span><span className="variante-label-badge">{v.label}</span></div></td>
                          <td style={{ color: "var(--text2)", fontSize: 11 }}>—</td><td style={{ color: "var(--text2)", fontSize: 11 }}>—</td><td style={{ color: "var(--text2)", fontSize: 11 }}>—</td><td style={{ color: "var(--text2)", fontSize: 12 }}>—</td><td style={{ color: "var(--text2)", fontSize: 12 }}>—</td><td style={{ color: "var(--text2)", fontSize: 12 }}>—</td><td style={{ color: "var(--text2)", fontSize: 12 }}>—</td><td style={{ color: "var(--text2)", fontSize: 12 }}>—</td>
                          <td><span className={`badge ${v.estoque === 0 ? "badge-red" : vBaixo ? "badge-yellow" : "badge-green"}`}>{v.estoque} un.</span></td>
                          <td></td>
                          <td><div style={{ display: "flex", gap: 6 }}><button className="btn-icon" onClick={() => setEditandoVariante({ id: v.id, label: v.label, estoque: v.estoque })}><Icon name="edit" /></button><button className="btn-icon danger" onClick={async () => { await onRemoverVariante(v.id); toast("Variante removida"); }}><Icon name="trash" /></button></div></td>
                        </tr>
                      );
                    }) : [])
                  ];
                })}
              </tbody>
            </table>
          }
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? "Editar Produto" : "Novo Produto"} wide>
        <form onSubmit={submit}>
          <div className="form-grid form-grid-2">
            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label className="input-label">Foto do produto</label>
              <div className="img-upload">
                <div className="img-upload-preview">
                  {enviandoImagem ? <div className="spinner" style={{ width: 18, height: 18 }} /> : form.imagem ? <img src={form.imagem} alt="Preview" /> : "🎮"}
                </div>
                <div className="img-upload-actions">
                  <label className="img-upload-label" htmlFor="input-foto-produto"><Icon name="image" size={14} />{form.imagem ? "Trocar foto" : "Escolher foto"}</label>
                  <input id="input-foto-produto" type="file" accept="image/*" onChange={selecionarImagem} />
                  {form.imagem && <button type="button" className="img-upload-remove" onClick={() => set("imagem", "")}>Remover foto</button>}
                </div>
              </div>
            </div>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}><label className="input-label">Nome *</label><input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} /></div>
            <div className="input-group">
              <label className="input-label">Categoria</label>
              <input className="input" list="dlist-categorias" placeholder="Escolha ou digite uma nova…" value={form.categoria} onChange={e => set("categoria", e.target.value)} />
              <datalist id="dlist-categorias">
                {categoriasDisponiveis.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="input-group">
              <label className="input-label">Console / Plataforma</label>
              <input className="input" list="dlist-consoles" placeholder="Escolha ou digite um novo…" value={form.console} onChange={e => set("console", e.target.value)} />
              <datalist id="dlist-consoles">
                {consolesDisponiveis.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="input-group"><label className="input-label">Marca</label><input className="input" placeholder="Sony, Microsoft, Logitech…" value={form.marca} onChange={e => set("marca", e.target.value)} /></div>
            <div className="input-group">
              <label className="input-label">Condição</label>
              <select className="input" value={form.condicao} onChange={e => set("condicao", e.target.value)}>
                {CONDICOES_PRODUTO.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Fornecedor</label>
              {fornecedoresCad.length > 0 ? (
                <select className="input" value={form.fornecedor} onChange={e => set("fornecedor", e.target.value)}>
                  <option value="">Selecione…</option>
                  {fornecedoresCad.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                </select>
              ) : (
                <input className="input" placeholder="Nome do fornecedor" value={form.fornecedor} onChange={e => set("fornecedor", e.target.value)} />
              )}
            </div>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}><label className="input-label">Descrição</label><input className="input" value={form.descricao} onChange={e => set("descricao", e.target.value)} /></div>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}><label className="input-label">Link do Mercado Livre (opcional)</label><input className="input" placeholder="https://produto.mercadolivre.com.br/..." value={form.linkML} onChange={e => set("linkML", e.target.value)} /></div>
            <div className="input-group" style={{ gridColumn: "1 / -1", flexDirection: "row", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="destaque-check" checked={form.destaque} onChange={e => set("destaque", e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
              <label htmlFor="destaque-check" className="input-label" style={{ margin: 0, cursor: "pointer" }}>⭐ Destacar este produto na loja online</label>
            </div>
            <div className="input-group"><label className="input-label">Preço de Compra</label><input className="input" type="number" step="0.01" min="0" value={form.precoCompra} onChange={e => set("precoCompra", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Preço de Venda *</label><input className="input" type="number" step="0.01" min="0" value={form.precoVenda} onChange={e => set("precoVenda", e.target.value)} /></div>
            {margemForm !== null && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="margem-preview">
                  <div className="margem-item"><span className="margem-item-label">Custo</span><span className="margem-item-value" style={{ color: "var(--red)" }}>{formatBRL(pc)}</span></div>
                  <div style={{ color: "var(--border2)", fontSize: 20 }}>→</div>
                  <div className="margem-item"><span className="margem-item-label">Venda</span><span className="margem-item-value" style={{ color: "var(--green)" }}>{formatBRL(pv)}</span></div>
                  <div style={{ color: "var(--border2)", fontSize: 20 }}>→</div>
                  <div className="margem-item"><span className="margem-item-label">Lucro</span><span className="margem-item-value" style={{ color: pv >= pc ? "var(--green)" : "var(--red)" }}>{formatBRL(pv - pc)}</span></div>
                  <div style={{ marginLeft: "auto" }}><span className={`badge ${margemForm > 30 ? "badge-green" : margemForm > 10 ? "badge-gold" : "badge-red"}`} style={{ fontSize: 14, padding: "5px 12px" }}>{margemForm.toFixed(1)}%</span></div>
                </div>
              </div>
            )}
            <div className="input-group"><label className="input-label">Estoque padrão</label><input className="input" type="number" min="0" value={form.quantidadeEstoque} onChange={e => set("quantidadeEstoque", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Qtd. Mínima (alerta)</label><input className="input" type="number" min="0" value={form.quantidadeMinima} onChange={e => set("quantidadeMinima", e.target.value)} /></div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editando ? "Salvar" : "Adicionar"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editandoVariante} onClose={() => setEditandoVariante(null)} title="Editar Variante">
        {editandoVariante && (
          <form onSubmit={salvarEdicaoVariante}>
            <div className="form-grid" style={{ gap: 14 }}>
              <div className="input-group"><label className="input-label">Label</label><input className="input" value={editandoVariante.label} onChange={e => setEditandoVariante(p => ({ ...p, label: e.target.value }))} /></div>
              <div className="input-group"><label className="input-label">Estoque</label><input className="input" type="number" min="0" value={editandoVariante.estoque} onChange={e => setEditandoVariante(p => ({ ...p, estoque: e.target.value }))} /></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditandoVariante(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Salvar</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!modalVariantes} onClose={() => setModalVariantes(null)} title={`Variantes — ${modalVariantes?.nome || ""}`} wide>
        {modalVariantes && (() => {
          const vars = variantesProduto.filter(v => v.produtoPaiId === modalVariantes.id);
          return (
            <div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>Cada variante é uma combinação livre, ex: <strong style={{ color: "var(--text)" }}>P/Preto</strong>, <strong style={{ color: "var(--text)" }}>G/Azul</strong>.</div>
              {vars.length === 0
                ? <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text2)", fontSize: 13 }}>Nenhuma variante ainda.</div>
                : <div className="variante-list" style={{ marginBottom: 20 }}>
                  {vars.map(v => (
                    <div key={v.id} className="variante-item">
                      <span className="variante-label-badge" style={{ fontSize: 13, padding: "4px 12px" }}>{v.label}</span>
                      <span className="variante-item-estoque"><span className={`badge ${v.estoque === 0 ? "badge-red" : v.estoque <= 5 ? "badge-yellow" : "badge-green"}`}>{v.estoque} un.</span></span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        <button className="btn-icon" onClick={() => setEditandoVariante({ id: v.id, label: v.label, estoque: v.estoque })}><Icon name="edit" /></button>
                        <button className="btn-icon danger" onClick={async () => { await onRemoverVariante(v.id); toast("Variante removida"); }}><Icon name="trash" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              }
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <div className="input-label" style={{ marginBottom: 10 }}>Adicionar nova variante</div>
                <form onSubmit={salvarVariante}>
                  <div className="add-variante-row">
                    <div className="input-group" style={{ flex: 2 }}><label className="input-label">Label (ex: P/Preto)</label><input className="input" placeholder="P/Preto" value={novaVariante.label} onChange={e => setNovaVariante(p => ({ ...p, label: e.target.value }))} /></div>
                    <div className="input-group" style={{ flex: 1 }}><label className="input-label">Estoque</label><input className="input" type="number" min="0" placeholder="0" value={novaVariante.estoque} onChange={e => setNovaVariante(p => ({ ...p, estoque: e.target.value }))} /></div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }}><Icon name="plus" />Adicionar</button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Remover Produto?" text="Todas as variantes também serão removidas." danger
        onConfirm={() => { onRemover(confirmId); setConfirmId(null); toast("Produto removido"); }}
        onCancel={() => setConfirmId(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// CLIENTES
// ─────────────────────────────────────────────
function Clientes({ dados, onAdicionar, onRemover, onAtualizar }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ nome: "", telefone: "", email: "" });
  const clientes = useMemo(() => {
    const lista = [...(dados.clientes || [])].sort((a, b) =>
      (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" })
    );
    if (!busca.trim()) return lista;
    const q = busca.toLowerCase();
    return lista.filter(c =>
      c.nome?.toLowerCase().includes(q) ||
      c.telefone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [dados.clientes, busca]);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function abrirModal(c = null) {
    if (c) { setEditando(c.id); setForm({ nome: c.nome, telefone: c.telefone || "", email: c.email || "" }); }
    else { setEditando(null); setForm({ nome: "", telefone: "", email: "" }); }
    setModal(true);
  }
  function submit(e) {
    e.preventDefault();
    if (!form.nome.trim()) return toast("Preencha o nome", "error");
    if (editando) { onAtualizar(editando, { ...form }); toast("Cliente atualizado"); }
    else { onAdicionar({ ...form }); toast("Cliente adicionado"); }
    setModal(false);
  }

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Clientes</h1><p className="page-sub">Base de clientes — ordem alfabética</p></div><button className="btn btn-primary" onClick={() => abrirModal()}><Icon name="plus" /> Novo</button></div>
      <div style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 300 }} placeholder="🔍 Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>
      <div className="card"><div className="table-wrap">
        {clientes.length === 0
          ? <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-text">{busca ? "Nenhum cliente encontrado" : "Nenhum cliente"}</div></div>
          : <table><thead><tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Desde</th><th></th></tr></thead>
            <tbody>{clientes.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.nome}</td>
                <td style={{ color: "var(--text2)" }}>{c.telefone || "—"}</td>
                <td style={{ color: "var(--text2)" }}>{c.email || "—"}</td>
                <td style={{ color: "var(--text2)" }}>{formatData(c.dataCriacao)}</td>
                <td><div style={{ display: "flex", gap: 6 }}><button className="btn-icon" onClick={() => abrirModal(c)}><Icon name="edit" /></button><button className="btn-icon danger" onClick={() => setConfirmId(c.id)}><Icon name="trash" /></button></div></td>
              </tr>
            ))}</tbody></table>
        }
      </div></div>
      <Modal open={modal} onClose={() => setModal(false)} title={editando ? "Editar Cliente" : "Novo Cliente"}>
        <form onSubmit={submit}>
          <div className="form-grid" style={{ gap: 14 }}>
            <div className="input-group"><label className="input-label">Nome *</label><input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Telefone</label><input className="input" value={form.telefone} onChange={e => set("telefone", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Email</label><input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editando ? "Salvar" : "Adicionar"}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!confirmId} title="Remover Cliente?" text="Ação irreversível." danger onConfirm={() => { onRemover(confirmId); setConfirmId(null); toast("Removido"); }} onCancel={() => setConfirmId(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// FORNECEDORES
// ─────────────────────────────────────────────
function Fornecedores({ dados, onAdicionar, onRemover, onAtualizar }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", produtos: "", observacoes: "" });

  const produtos = dados.produtos || [];
  const compras = dados.compras || [];

  const fornecedores = useMemo(() => {
    const lista = [...(dados.fornecedores || [])].sort((a, b) =>
      (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" })
    );
    if (!busca.trim()) return lista;
    const q = busca.toLowerCase();
    return lista.filter(f =>
      f.nome?.toLowerCase().includes(q) ||
      f.telefone?.toLowerCase().includes(q) ||
      f.produtos?.toLowerCase().includes(q)
    );
  }, [dados.fornecedores, busca]);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function abrirModal(f = null) {
    if (f) { setEditando(f.id); setForm({ nome: f.nome, telefone: f.telefone || "", email: f.email || "", produtos: f.produtos || "", observacoes: f.observacoes || "" }); }
    else { setEditando(null); setForm({ nome: "", telefone: "", email: "", produtos: "", observacoes: "" }); }
    setModal(true);
  }
  function submit(e) {
    e.preventDefault();
    if (!form.nome.trim()) return toast("Preencha o nome", "error");
    if (editando) { onAtualizar(editando, { ...form }); toast("Fornecedor atualizado"); }
    else { onAdicionar({ ...form }); toast("Fornecedor adicionado"); }
    setModal(false);
  }

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Fornecedores</h1><p className="page-sub">Cadastro de fornecedores e distribuidores</p></div><button className="btn btn-primary" onClick={() => abrirModal()}><Icon name="plus" /> Novo</button></div>
      <div style={{ marginBottom: 16 }}>
        <input className="input" style={{ maxWidth: 300 }} placeholder="🔍 Buscar fornecedor..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>
      <div className="card"><div className="table-wrap">
        {fornecedores.length === 0
          ? <div className="empty-state"><div className="empty-icon">🚚</div><div className="empty-text">{busca ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}</div></div>
          : <table><thead><tr><th>Nome</th><th>Telefone</th><th>Produtos fornecidos</th><th>Vinculados</th><th>Pedidos</th><th></th></tr></thead>
            <tbody>{fornecedores.map(f => {
              const qtdProdutos = produtos.filter(p => p.fornecedor === f.nome).length;
              const qtdPedidos = compras.filter(c => c.fornecedor === f.nome).length;
              return (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.nome}</td>
                  <td style={{ color: "var(--text2)" }}>{f.telefone || "—"}</td>
                  <td style={{ color: "var(--text2)", fontSize: 12 }}>{f.produtos || "—"}</td>
                  <td><span className="badge badge-green">{qtdProdutos} produto{qtdProdutos !== 1 ? "s" : ""}</span></td>
                  <td><span className="badge badge-gold">{qtdPedidos} pedido{qtdPedidos !== 1 ? "s" : ""}</span></td>
                  <td><div style={{ display: "flex", gap: 6 }}><button className="btn-icon" onClick={() => abrirModal(f)}><Icon name="edit" /></button><button className="btn-icon danger" onClick={() => setConfirmId(f.id)}><Icon name="trash" /></button></div></td>
                </tr>
              );
            })}</tbody></table>
        }
      </div></div>
      <Modal open={modal} onClose={() => setModal(false)} title={editando ? "Editar Fornecedor" : "Novo Fornecedor"}>
        <form onSubmit={submit}>
          <div className="form-grid" style={{ gap: 14 }}>
            <div className="input-group"><label className="input-label">Nome *</label><input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Telefone / WhatsApp</label><input className="input" value={form.telefone} onChange={e => set("telefone", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Email</label><input className="input" type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Produtos fornecidos</label><input className="input" placeholder="Ex: Consoles, controles, jogos" value={form.produtos} onChange={e => set("produtos", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Observações</label><input className="input" value={form.observacoes} onChange={e => set("observacoes", e.target.value)} /></div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editando ? "Salvar" : "Adicionar"}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!confirmId} title="Remover Fornecedor?" text="Ação irreversível." danger onConfirm={() => { onRemover(confirmId); setConfirmId(null); toast("Removido"); }} onCancel={() => setConfirmId(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// CATEGORIAS
// ─────────────────────────────────────────────
function Categorias({ dados, onAdicionar, onRemover }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "receita", cor: "#3ecf8e" });
  const [confirmId, setConfirmId] = useState(null);
  const categorias = dados.categorias || [];
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function submit(e) {
    e.preventDefault();
    if (!form.nome.trim()) return toast("Preencha o nome", "error");
    onAdicionar({ ...form }); toast("Categoria adicionada");
    setModal(false); setForm({ nome: "", tipo: "receita", cor: "#3ecf8e" });
  }
  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Categorias</h1></div><button className="btn btn-primary" onClick={() => setModal(true)}><Icon name="plus" /> Nova</button></div>
      <div className="card"><div className="table-wrap">
        {categorias.length === 0
          ? <div className="empty-state"><div className="empty-icon">🏷️</div><div className="empty-text">Nenhuma categoria</div></div>
          : <table><thead><tr><th>Nome</th><th>Tipo</th><th>Cor</th><th></th></tr></thead>
            <tbody>{categorias.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.nome}</td>
                <td><span className={`badge ${c.tipo === "receita" ? "badge-green" : "badge-red"}`}>{c.tipo}</span></td>
                <td><div style={{ width: 20, height: 20, borderRadius: 6, background: c.cor, border: "1px solid var(--border2)" }} /></td>
                <td><button className="btn-icon danger" onClick={() => setConfirmId(c.id)}><Icon name="trash" /></button></td>
              </tr>
            ))}</tbody></table>
        }
      </div></div>
      <Modal open={modal} onClose={() => setModal(false)} title="Nova Categoria">
        <form onSubmit={submit}>
          <div className="form-grid" style={{ gap: 14 }}>
            <div className="input-group"><label className="input-label">Nome *</label><input className="input" value={form.nome} onChange={e => set("nome", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Tipo</label><select className="input" value={form.tipo} onChange={e => set("tipo", e.target.value)}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></div>
            <div className="input-group"><label className="input-label">Cor</label><input className="input" type="color" value={form.cor} onChange={e => set("cor", e.target.value)} /></div>
          </div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Adicionar</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!confirmId} title="Remover?" text="Irreversível." danger onConfirm={() => { onRemover(confirmId); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPRAS — com Carrinho de Itens  ← NOVO
// ─────────────────────────────────────────────
function Compras({ compras, fornecedores = [], onAdicionar, onReceber, onRemover }) {
  const [modal, setModal] = useState(false);
  const [aba, setAba] = useState("pendentes");
  const [confirmId, setConfirmId] = useState(null);

  // Formulário principal do pedido
  const [form, setForm] = useState({ fornecedor: "", data: hojeLocal(), observacoes: "" });

  // Carrinho de itens
  const [itens, setItens] = useState([]);
  const [itemForm, setItemForm] = useState({ descricao: "", quantidade: "1", valorUnitario: "" });

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function setIF(k, v) { setItemForm(p => ({ ...p, [k]: v })); }

  const totalCarrinho = itens.reduce((s, i) => s + i.subtotal, 0);

  function adicionarItem(e) {
    e.preventDefault();
    if (!itemForm.descricao.trim()) return toast("Informe a descrição do item", "error");
    if (!itemForm.valorUnitario || parseFloat(itemForm.valorUnitario) <= 0) return toast("Valor unitário inválido", "error");
    const qtd = parseInt(itemForm.quantidade) || 1;
    const vu = parseFloat(itemForm.valorUnitario);
    setItens(p => [...p, { id: uid(), descricao: itemForm.descricao.trim(), quantidade: qtd, valorUnitario: vu, subtotal: qtd * vu }]);
    setItemForm({ descricao: "", quantidade: "1", valorUnitario: "" });
    toast("Item adicionado ao carrinho ✓");
  }

  function removerItem(id) { setItens(p => p.filter(i => i.id !== id)); }

  function fecharPedido() {
    if (!form.fornecedor.trim()) return toast("Informe o fornecedor", "error");
    if (itens.length === 0) return toast("Adicione pelo menos 1 item ao carrinho", "error");

    // Monta descrição dos itens para a observação
    const itensDesc = itens.map(i => `${i.descricao} (${i.quantidade}x ${formatBRL(i.valorUnitario)})`).join("; ");
    const obsCompleta = [form.observacoes.trim(), `Itens: ${itensDesc}`].filter(Boolean).join(" | ");

    onAdicionar({
      fornecedor: form.fornecedor.trim(),
      valor: totalCarrinho,
      data: form.data || hojeLocal(),
      observacoes: obsCompleta,
      itens: itens,
      status: "aguardando"
    });

    setForm({ fornecedor: "", data: hojeLocal(), observacoes: "" });
    setItens([]);
    setItemForm({ descricao: "", quantidade: "1", valorUnitario: "" });
    setModal(false);
    toast("Compra registrada! ✓");
  }

  const pendentes = compras.filter(c => c.status === "aguardando").sort((a, b) => new Date(b.data) - new Date(a.data));
  const historico = compras.filter(c => c.status === "recebido").sort((a, b) => new Date(b.dataRecebimento || b.data) - new Date(a.dataRecebimento || a.data));
  const totalPendente = pendentes.reduce((s, c) => s + c.valor, 0);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Compras</h1><p className="page-sub">Pedidos de mercadoria</p></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Icon name="cart" />Nova Compra</button>
      </div>
      {pendentes.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: "rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.04)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 24 }}>🛒</div>
            <div><div style={{ fontWeight: 700, fontSize: 14, color: "#a78bfa" }}>{pendentes.length} pedido{pendentes.length > 1 ? "s" : ""} aguardando</div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>Total: <strong style={{ color: "var(--accent)" }}>{formatBRL(totalPendente)}</strong></div></div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${aba === "pendentes" ? "btn-primary" : "btn-secondary"}`} onClick={() => setAba("pendentes")}>🕐 Aguardando {pendentes.length > 0 && `(${pendentes.length})`}</button>
        <button className={`btn btn-sm ${aba === "historico" ? "btn-primary" : "btn-secondary"}`} onClick={() => setAba("historico")}>✅ Recebidos {historico.length > 0 && `(${historico.length})`}</button>
      </div>
      {aba === "pendentes" && (
        <div className="compras-pendentes-list">
          {pendentes.length === 0
            ? <div className="empty-state"><div className="empty-icon">🛒</div><div className="empty-text">Nenhuma compra pendente</div></div>
            : pendentes.map(c => (
              <div key={c.id} className="compra-card">
                <div style={{ fontSize: 28 }}>📦</div>
                <div className="compra-card-info">
                  <div className="compra-card-fornecedor">{c.fornecedor}</div>
                  <div className="compra-card-valor">{formatBRL(c.valor)}</div>
                  <div className="compra-card-meta">📅 {formatData(c.data)}</div>
                  {/* Itens do carrinho */}
                  {c.itens && c.itens.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {c.itens.map(i => (
                        <div key={i.id} style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 10 }}>
                          <span style={{ color: "var(--text)" }}>• {i.descricao}</span>
                          <span>{i.quantidade}x {formatBRL(i.valorUnitario)}</span>
                          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{formatBRL(i.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {c.observacoes && !c.itens && <div className="compra-card-obs">{c.observacoes}</div>}
                </div>
                <div className="compra-card-actions">
                  <button className="btn btn-sm btn-success" onClick={() => onReceber(c.id)}><Icon name="check" size={13} />Recebido</button>
                  <button className="btn-icon danger" onClick={() => setConfirmId(c.id)}><Icon name="trash" /></button>
                </div>
              </div>
            ))
          }
        </div>
      )}
      {aba === "historico" && (
        <div className="card"><div className="table-wrap">
          {historico.length === 0
            ? <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-text">Nenhum recebimento</div></div>
            : <table><thead><tr><th>Pedido em</th><th>Fornecedor</th><th>Itens</th><th>Recebido em</th><th style={{ textAlign: "right" }}>Valor</th><th></th></tr></thead>
              <tbody>{historico.map(c => (
                <tr key={c.id}>
                  <td style={{ color: "var(--text2)", whiteSpace: "nowrap" }}>{formatData(c.data)}</td>
                  <td style={{ fontWeight: 600 }}>{c.fornecedor}</td>
                  <td style={{ fontSize: 11, color: "var(--text2)" }}>
                    {c.itens && c.itens.length > 0
                      ? c.itens.map(i => `${i.descricao} (${i.quantidade}x)`).join(", ")
                      : c.observacoes || "—"}
                  </td>
                  <td><span className="badge badge-green">✓ {formatData(c.dataRecebimento)}</span></td>
                  <td style={{ fontWeight: 700, color: "var(--accent)", textAlign: "right" }}>{formatBRL(c.valor)}</td>
                  <td><button className="btn-icon danger" onClick={() => setConfirmId(c.id)}><Icon name="trash" /></button></td>
                </tr>
              ))}</tbody></table>
          }
        </div></div>
      )}

      {/* MODAL — Nova Compra com Carrinho */}
      <Modal open={modal} onClose={() => { setModal(false); setItens([]); setForm({ fornecedor: "", data: hojeLocal(), observacoes: "" }); setItemForm({ descricao: "", quantidade: "1", valorUnitario: "" }); }} title="Nova Compra" wide>
        <div>
          {/* Dados do pedido */}
          <div className="form-grid form-grid-2" style={{ marginBottom: 20 }}>
            <div className="input-group">
              <label className="input-label">Fornecedor *</label>
              {fornecedores.length > 0 ? (
                <select className="input" value={form.fornecedor} onChange={e => setF("fornecedor", e.target.value)}>
                  <option value="">Selecione…</option>
                  {fornecedores.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
                </select>
              ) : (
                <input className="input" placeholder="Ex: Fornecedor SP" value={form.fornecedor} onChange={e => setF("fornecedor", e.target.value)} />
              )}
            </div>
            <div className="input-group"><label className="input-label">Data do Pedido</label><input className="input" type="date" value={form.data} onChange={e => setF("data", e.target.value)} /></div>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}><label className="input-label">Observações gerais</label><textarea className="input" value={form.observacoes} onChange={e => setF("observacoes", e.target.value)} style={{ minHeight: 60 }} /></div>
          </div>

          {/* CARRINHO DE ITENS */}
          <div className="cart-section">
            <div className="cart-section-title">🛒 Itens do Pedido</div>

            {/* Adicionar item */}
            <form onSubmit={adicionarItem}>
              <div className="cart-add-row">
                <div className="input-group">
                  <label className="input-label">Descrição do Item *</label>
                  <input className="input" placeholder="Ex: Camiseta Dry-Fit P/Preta" value={itemForm.descricao} onChange={e => setIF("descricao", e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Qtd.</label>
                  <input className="input" type="number" min="1" value={itemForm.quantidade} onChange={e => setIF("quantidade", e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Valor Unit. (R$)</label>
                  <input className="input" type="number" step="0.01" min="0" placeholder="0,00" value={itemForm.valorUnitario} onChange={e => setIF("valorUnitario", e.target.value)} />
                </div>
                <button type="submit" className="btn btn-info" style={{ alignSelf: "flex-end" }}>
                  <Icon name="plus" />Adicionar
                </button>
              </div>
            </form>

            {/* Lista de itens */}
            {itens.length === 0
              ? <div className="cart-empty">Nenhum item adicionado ainda. Preencha os campos acima e clique em <strong>Adicionar</strong>.</div>
              : <>
                {itens.map(i => (
                  <div key={i.id} className="cart-item-row">
                    <span className="cart-item-name">{i.descricao}</span>
                    <span className="cart-item-qty">{i.quantidade}x {formatBRL(i.valorUnitario)}</span>
                    <span className="cart-item-price">{formatBRL(i.subtotal)}</span>
                    <button className="btn-icon danger" onClick={() => removerItem(i.id)}><Icon name="trash" /></button>
                  </div>
                ))}
                <div className="cart-total-row">
                  <span className="cart-total-label">Total do Pedido ({itens.length} {itens.length === 1 ? "item" : "itens"})</span>
                  <span className="cart-total-value">{formatBRL(totalCarrinho)}</span>
                </div>
              </>
            }
          </div>

          <div className="warn-box" style={{ marginBottom: 14 }}>🛒 Esta compra não afeta o saldo nem o estoque automaticamente.</div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setModal(false); setItens([]); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={fecharPedido} disabled={itens.length === 0 || !form.fornecedor.trim()}>
              <Icon name="check" />Registrar Compra {itens.length > 0 && `— ${formatBRL(totalCarrinho)}`}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Remover Compra?" text="A compra será removida." danger onConfirm={() => { onRemover(confirmId); setConfirmId(null); toast("Removida"); }} onCancel={() => setConfirmId(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// ENCOMENDAS
// ─────────────────────────────────────────────
function Encomendas({ encomendas, onAdicionar, onAtualizar, onRemover }) {
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [aba, setAba] = useState("ativas");
  const [form, setForm] = useState({ cliente: "", telefone: "", produto: "", quantidade: "1", valorTotal: "", sinal: "0", dataEntrega: "", observacoes: "", status: "aguardando" });

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function abrirModal(enc = null) {
    if (enc) {
      setEditando(enc.id);
      setForm({ cliente: enc.cliente, telefone: enc.telefone || "", produto: enc.produto, quantidade: enc.quantidade, valorTotal: enc.valorTotal, sinal: enc.sinal || "0", dataEntrega: enc.dataEntrega || "", observacoes: enc.observacoes || "", status: enc.status });
    } else {
      setEditando(null);
      setForm({ cliente: "", telefone: "", produto: "", quantidade: "1", valorTotal: "", sinal: "0", dataEntrega: "", observacoes: "", status: "aguardando" });
    }
    setModal(true);
  }

  function submit(e) {
    e.preventDefault();
    if (!form.cliente.trim()) return toast("Informe o nome do cliente", "error");
    if (!form.produto.trim()) return toast("Informe o produto", "error");
    if (!form.valorTotal || parseFloat(form.valorTotal) <= 0) return toast("Informe o valor total", "error");
    const payload = { cliente: form.cliente.trim(), telefone: form.telefone.trim(), produto: form.produto.trim(), quantidade: parseInt(form.quantidade) || 1, valorTotal: parseFloat(form.valorTotal), sinal: parseFloat(form.sinal) || 0, dataEntrega: form.dataEntrega || "", observacoes: form.observacoes.trim(), status: form.status };
    if (editando) { onAtualizar(editando, payload); toast("Encomenda atualizada ✓"); }
    else { onAdicionar(payload); toast("Encomenda registrada! ✓"); }
    setModal(false);
  }

  function avancarStatus(enc) {
    const proximo = enc.status === "aguardando" ? "pronto" : enc.status === "pronto" ? "entregue" : null;
    if (!proximo) return;
    onAtualizar(enc.id, { status: proximo, ...(proximo === "entregue" ? { dataEntregue: hojeLocal() } : {}) });
    toast(proximo === "pronto" ? "Marcado como pronto! 🎉" : "Entregue! ✅");
  }

  function gerarWhatsApp(enc) {
    if (!enc.telefone) return toast("Sem telefone cadastrado", "error");
    const restante = enc.valorTotal - (enc.sinal || 0);
    const fone = enc.telefone.replace(/\D/g, "");
    const msg = `Olá ${enc.cliente}! 😊\n\nSua encomenda está *pronta*! 🎉\n\n📦 *Produto:* ${enc.produto} (${enc.quantidade} un.)\n💰 *Valor total:* R$ ${enc.valorTotal.toFixed(2).replace(".", ",")}\n${enc.sinal > 0 ? `✅ *Sinal pago:* R$ ${enc.sinal.toFixed(2).replace(".", ",")}\n💵 *Restante:* R$ ${restante.toFixed(2).replace(".", ",")}\n` : ""}📍 LF Games\n\nAguardamos você! 🙌`;
    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const STATUS_LABEL = { aguardando: "Aguardando", pronto: "Pronto p/ retirar", entregue: "Entregue" };
  const STATUS_BADGE = { aguardando: "badge-yellow", pronto: "badge-blue", entregue: "badge-green" };
  const STATUS_BTN = { aguardando: { label: "✅ Marcar Pronto", cls: "btn-info" }, pronto: { label: "📦 Marcar Entregue", cls: "btn-success" } };

  const hoje = hojeLocal();
  const ativas = encomendas.filter(e => e.status !== "entregue").sort((a, b) => {
    if (a.dataEntrega && b.dataEntrega) return new Date(a.dataEntrega) - new Date(b.dataEntrega);
    return new Date(b.criadoEm) - new Date(a.criadoEm);
  });
  const entregues = encomendas.filter(e => e.status === "entregue").sort((a, b) => new Date(b.dataEntregue || b.criadoEm) - new Date(a.dataEntregue || a.criadoEm));
  const atrasadas = ativas.filter(e => e.dataEntrega && e.dataEntrega < hoje);
  const totalAtivas = ativas.reduce((s, e) => s + e.valorTotal, 0);
  const totalSinais = ativas.reduce((s, e) => s + (e.sinal || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Encomendas</h1><p className="page-sub">Pedidos sob encomenda dos clientes</p></div>
        <button className="btn btn-primary" onClick={() => abrirModal()}><Icon name="plus" />Nova Encomenda</button>
      </div>

      {ativas.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
          <div className="stat-card blue" style={{ padding: "18px 20px" }}><div className="stat-label">Encomendas Ativas</div><div className="stat-value" style={{ fontSize: 28 }}>{ativas.length}</div></div>
          <div className="stat-card gold" style={{ padding: "18px 20px" }}><div className="stat-label">A Receber</div><div className="stat-value" style={{ fontSize: 22 }}>{formatBRL(totalAtivas - totalSinais)}</div><div className="stat-sub">Sinais: {formatBRL(totalSinais)}</div></div>
          <div className={`stat-card ${atrasadas.length > 0 ? "red" : "green"}`} style={{ padding: "18px 20px" }}><div className="stat-label">Atrasadas</div><div className="stat-value" style={{ fontSize: 28 }}>{atrasadas.length}</div></div>
        </div>
      )}

      {atrasadas.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: "rgba(240,96,96,0.3)", background: "rgba(240,96,96,0.04)" }}>
          <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 22 }}>⚠️</div>
            <div><div style={{ fontWeight: 700, color: "var(--red)", fontSize: 13 }}>Encomendas atrasadas!</div>
              <div style={{ fontSize: 12, color: "var(--text2)" }}>{atrasadas.map(e => e.cliente).join(", ")}</div></div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${aba === "ativas" ? "btn-primary" : "btn-secondary"}`} onClick={() => setAba("ativas")}>🕐 Ativas {ativas.length > 0 && `(${ativas.length})`}</button>
        <button className={`btn btn-sm ${aba === "entregues" ? "btn-primary" : "btn-secondary"}`} onClick={() => setAba("entregues")}>✅ Entregues {entregues.length > 0 && `(${entregues.length})`}</button>
      </div>

      {aba === "ativas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ativas.length === 0
            ? <div className="empty-state"><div className="empty-icon">📦</div><div className="empty-text">Nenhuma encomenda ativa</div></div>
            : ativas.map(enc => {
              const restante = enc.valorTotal - (enc.sinal || 0);
              const atrasada = enc.dataEntrega && enc.dataEntrega < hoje;
              return (
                <div key={enc.id} className="compra-card" style={{ borderColor: atrasada ? "rgba(240,96,96,0.35)" : undefined }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>📦</div>
                  <div className="compra-card-info" style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{enc.cliente}</span>
                      {enc.telefone && <span style={{ fontSize: 12, color: "var(--text2)" }}>📱 {enc.telefone}</span>}
                      <span className={`badge ${STATUS_BADGE[enc.status]}`}>{STATUS_LABEL[enc.status]}</span>
                      {atrasada && <span className="badge badge-red">⚠ Atrasada</span>}
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "var(--accent)", marginTop: 2 }}>
                      {formatBRL(enc.valorTotal)}
                      {enc.sinal > 0 && <span style={{ fontSize: 13, color: "var(--green)", marginLeft: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>✓ Sinal: {formatBRL(enc.sinal)}</span>}
                      {restante > 0 && enc.sinal > 0 && <span style={{ fontSize: 13, color: "var(--yellow)", marginLeft: 8, fontFamily: "'DM Sans', sans-serif" }}>Restante: {formatBRL(restante)}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                      🛍️ {enc.produto} · {enc.quantidade} un.
                      {enc.dataEntrega && <span style={{ marginLeft: 10 }}>📅 Entrega: <strong style={{ color: atrasada ? "var(--red)" : "var(--text)" }}>{formatData(enc.dataEntrega)}</strong></span>}
                    </div>
                    {enc.observacoes && <div className="compra-card-obs">{enc.observacoes}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    {STATUS_BTN[enc.status] && <button className={`btn btn-sm ${STATUS_BTN[enc.status].cls}`} onClick={() => avancarStatus(enc)}>{STATUS_BTN[enc.status].label}</button>}
                    {enc.status === "pronto" && enc.telefone && (
                      <button className="btn btn-sm btn-whatsapp" onClick={() => gerarWhatsApp(enc)}>📲 WhatsApp</button>
                    )}
                    <button className="btn-icon" onClick={() => abrirModal(enc)}><Icon name="edit" /></button>
                    <button className="btn-icon danger" onClick={() => setConfirmId(enc.id)}><Icon name="trash" /></button>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {aba === "entregues" && (
        <div className="card"><div className="table-wrap">
          {entregues.length === 0
            ? <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-text">Nenhuma entrega ainda</div></div>
            : <table><thead><tr><th>Cliente</th><th>Produto</th><th>Valor</th><th>Entregue em</th><th></th></tr></thead>
              <tbody>{entregues.map(enc => (
                <tr key={enc.id}>
                  <td style={{ fontWeight: 600 }}>{enc.cliente}<div style={{ fontSize: 11, color: "var(--text2)" }}>{enc.telefone}</div></td>
                  <td>{enc.produto} · {enc.quantidade} un.</td>
                  <td style={{ fontWeight: 700, color: "var(--accent)" }}>{formatBRL(enc.valorTotal)}</td>
                  <td><span className="badge badge-green">✓ {formatData(enc.dataEntregue)}</span></td>
                  <td><button className="btn-icon danger" onClick={() => setConfirmId(enc.id)}><Icon name="trash" /></button></td>
                </tr>
              ))}</tbody></table>
          }
        </div></div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? "Editar Encomenda" : "Nova Encomenda"} wide>
        <form onSubmit={submit}>
          <div className="form-grid form-grid-2" style={{ gap: 14 }}>
            <div className="input-group"><label className="input-label">Nome do Cliente *</label><input className="input" placeholder="Ex: Maria Silva" value={form.cliente} onChange={e => set("cliente", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Telefone / WhatsApp</label><input className="input" placeholder="(11) 99999-9999" value={form.telefone} onChange={e => set("telefone", e.target.value)} /></div>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}><label className="input-label">Produto(s) Pedido(s) *</label><input className="input" placeholder="Ex: Camiseta Dry-Fit P/Preta + Short M/Azul" value={form.produto} onChange={e => set("produto", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Quantidade</label><input className="input" type="number" min="1" value={form.quantidade} onChange={e => set("quantidade", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Data de Entrega</label><input className="input" type="date" value={form.dataEntrega} onChange={e => set("dataEntrega", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Valor Total (R$) *</label><input className="input" type="number" step="0.01" min="0" placeholder="0,00" value={form.valorTotal} onChange={e => set("valorTotal", e.target.value)} /></div>
            <div className="input-group">
              <label className="input-label">Sinal / Adiantamento (R$)</label>
              <input className="input" type="number" step="0.01" min="0" placeholder="0,00" value={form.sinal} onChange={e => set("sinal", e.target.value)} />
              {parseFloat(form.sinal) > 0 && parseFloat(form.valorTotal) > 0 && (
                <span style={{ fontSize: 11, color: "var(--green)", marginTop: 3 }}>Restante: {formatBRL(parseFloat(form.valorTotal) - parseFloat(form.sinal))}</span>
              )}
            </div>
            {editando && (
              <div className="input-group">
                <label className="input-label">Status</label>
                <select className="input" value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="aguardando">Aguardando</option>
                  <option value="pronto">Pronto p/ retirar</option>
                  <option value="entregue">Entregue</option>
                </select>
              </div>
            )}
            <div className="input-group" style={{ gridColumn: "1 / -1" }}><label className="input-label">Observações</label><textarea className="input" placeholder="Detalhes adicionais..." value={form.observacoes} onChange={e => set("observacoes", e.target.value)} style={{ minHeight: 70 }} /></div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary"><Icon name="check" />{editando ? "Salvar" : "Registrar Encomenda"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Remover Encomenda?" text="A encomenda será removida permanentemente." danger
        onConfirm={() => { onRemover(confirmId); setConfirmId(null); toast("Removida"); }}
        onCancel={() => setConfirmId(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// FIADO / COBRANÇAS
// ─────────────────────────────────────────────
function Fiado({ fiados, onAdicionar, onPagar, onPagarParcial, onRemover, dados }) {
  const [modal, setModal] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [aba, setAba] = useState("pendentes");
  const [modalParcial, setModalParcial] = useState(null);
  const [valorParcial, setValorParcial] = useState("");

  // Dados do fiado (cliente, data, pagamento, obs)
  const [meta, setMeta] = useState({ nome: "", telefone: "", data: hojeLocal(), formaPagamento: "pix", observacoes: "" });
  // Carrinho de itens
  const [itens, setItens] = useState([]);

  const FORMA_LABEL = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão", transferencia: "Transferência" };
  const FORMA_EMOJI = { pix: "💠", dinheiro: "💵", cartao: "💳", transferencia: "🏦" };

  const estoqueReservado = useMemo(() => {
    const map = {};
    itens.forEach(i => {
      const key = i.varianteId || i.produtoId;
      map[key] = (map[key] || 0) + i.quantidade;
    });
    return map;
  }, [itens]);

  const totalCarrinho = itens.reduce((s, i) => s + i.subtotal, 0);

  function setM(k, v) { setMeta(p => ({ ...p, [k]: v })); }
  function removerItem(id) { setItens(p => p.filter(i => i.id !== id)); }

  function abrirModal() {
    setMeta({ nome: "", telefone: "", data: hojeLocal(), formaPagamento: "pix", observacoes: "" });
    setItens([]);
    setModal(true);
  }

  function submit(e) {
    e.preventDefault();
    if (!meta.nome.trim()) return toast("Informe o nome do cliente", "error");
    if (itens.length === 0) return toast("Adicione pelo menos 1 item ao fiado", "error");

    // Monta descrição a partir dos itens
    const descricao = itens.map(i => `${i.label} (${i.quantidade}x)`).join(", ");

    onAdicionar({
      nome: meta.nome.trim(),
      telefone: meta.telefone.trim(),
      valor: totalCarrinho,
      data: meta.data || hojeLocal(),
      formaPagamento: meta.formaPagamento,
      observacoes: meta.observacoes.trim(),
      status: "pendente",
      itens: itens,
      // mantém compatibilidade com código legado (item único)
      produtoId: itens.length === 1 ? itens[0].produtoId : null,
      varianteId: itens.length === 1 ? itens[0].varianteId : null,
      quantidade: itens.reduce((s, i) => s + i.quantidade, 0),
    });

    setModal(false);
    toast("Fiado registrado! Estoque baixado ✓");
  }

  function gerarWhatsApp(f) {
    if (!f.telefone) return toast("Sem telefone cadastrado", "error");
    const fone = f.telefone.replace(/\D/g, "");
    const forma = FORMA_LABEL[f.formaPagamento] || f.formaPagamento;
    const emoji = FORMA_EMOJI[f.formaPagamento] || "💰";
    const msg = `Olá ${f.nome}! 😊\n\nPassando pra lembrar do valor que ficou em aberto aqui na *LF Games*.\n\n💰 *Valor:* R$ ${f.valor.toFixed(2).replace(".", ",")}\n${emoji} *Forma combinada:* ${forma}\n📅 *Data:* ${formatData(f.data)}\n${f.observacoes ? `📝 *Ref.:* ${f.observacoes}\n` : ""}\nQualquer dúvida, é só chamar! Obrigada 🙏`;
    window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const pendentes = fiados.filter(f => f.status === "pendente").sort((a, b) => new Date(a.data) - new Date(b.data));
  const pagos = fiados.filter(f => f.status === "pago").sort((a, b) => new Date(b.dataPagamento || b.criadoEm) - new Date(a.dataPagamento || a.criadoEm));
  const totalPendente = pendentes.reduce((s, f) => s + f.valor, 0);
  const totalRecebido = pagos.reduce((s, f) => s + f.valor, 0);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Fiado / Cobranças</h1><p className="page-sub">Controle de valores em aberto e lembretes de cobrança</p></div>
        <button className="btn btn-primary" onClick={abrirModal}><Icon name="plus" />Novo Fiado</button>
      </div>

      <div className="stats-grid-3">
        <div className="stat-card red"><div className="stat-label">Em Aberto</div><div className="stat-value">{formatBRL(totalPendente)}</div><div className="stat-sub">{pendentes.length} pessoa{pendentes.length !== 1 ? "s" : ""}</div></div>
        <div className="stat-card green"><div className="stat-label">Já Recebido</div><div className="stat-value">{formatBRL(totalRecebido)}</div><div className="stat-sub">{pagos.length} pagamento{pagos.length !== 1 ? "s" : ""}</div></div>
        <div className="stat-card gold"><div className="stat-label">Total Fiado</div><div className="stat-value">{formatBRL(totalPendente + totalRecebido)}</div></div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${aba === "pendentes" ? "btn-primary" : "btn-secondary"}`} onClick={() => setAba("pendentes")}>💰 Em Aberto {pendentes.length > 0 && `(${pendentes.length})`}</button>
        <button className={`btn btn-sm ${aba === "pagos" ? "btn-primary" : "btn-secondary"}`} onClick={() => setAba("pagos")}>✅ Recebidos {pagos.length > 0 && `(${pagos.length})`}</button>
      </div>

      {aba === "pendentes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pendentes.length === 0
            ? <div className="empty-state"><div className="empty-icon">🤝</div><div className="empty-text">Nenhum fiado pendente</div></div>
            : pendentes.map(f => (
              <div key={f.id} className="compra-card">
                <div style={{ fontSize: 28, flexShrink: 0 }}>🤝</div>
                <div className="compra-card-info" style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{f.nome}</span>
                    {f.telefone && <span style={{ fontSize: 12, color: "var(--text2)" }}>📱 {f.telefone}</span>}
                    <span className="badge badge-yellow">Pendente</span>
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "var(--red)", marginTop: 2 }}>{formatBRL(f.valor)}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span>📅 {formatData(f.data)}</span>
                    <span>{FORMA_EMOJI[f.formaPagamento]} {FORMA_LABEL[f.formaPagamento]}</span>
                  </div>
                  {/* Itens do carrinho */}
                  {f.itens && f.itens.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                      {f.itens.map((i, idx) => (
                        <div key={idx} style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 8 }}>
                          <span style={{ color: "var(--text)" }}>• {i.label}</span>
                          <span>{i.quantidade}x {formatBRL(i.precoUnit)}</span>
                          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{formatBRL(i.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Histórico de pagamentos parciais */}
                  {f.historicoPagamentos && f.historicoPagamentos.length > 0 && (
                    <div style={{ marginTop: 6, borderLeft: "2px solid rgba(255,45,77,0.3)", paddingLeft: 8 }}>
                      <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Parcelas recebidas:</div>
                      {f.historicoPagamentos.map((p, i) => (
                        <div key={i} style={{ fontSize: 12, color: "var(--text2)", display: "flex", gap: 8 }}>
                          <span style={{ color: "var(--green)", fontWeight: 700 }}>{formatBRL(p.valor)}</span>
                          <span>em {formatData(p.data)}</span>
                        </div>
                      ))}
                      {f.totalPago > 0 && (
                        <div style={{ fontSize: 12, marginTop: 4, color: "var(--accent)", fontWeight: 700 }}>
                          Total já pago: {formatBRL(f.totalPago)}
                        </div>
                      )}
                    </div>
                  )}
                  {f.observacoes && <div className="compra-card-obs">{f.observacoes}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-sm btn-success" onClick={() => onPagar(f.id)}><Icon name="check" size={13} />Recebido</button>
                  <button className="btn btn-sm btn-info" onClick={() => { setModalParcial(f); setValorParcial(""); }}>💰 Parcial</button>
                  {f.telefone && <button className="btn btn-sm btn-whatsapp" onClick={() => gerarWhatsApp(f)}>📲 Cobrar</button>}
                  <button className="btn-icon danger" onClick={() => setConfirmId(f.id)}><Icon name="trash" /></button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {aba === "pagos" && (
        <div className="card"><div className="table-wrap">
          {pagos.length === 0
            ? <div className="empty-state"><div className="empty-icon">📋</div><div className="empty-text">Nenhum pagamento</div></div>
            : <table><thead><tr><th>Nome</th><th>Valor</th><th>Forma</th><th>Pago em</th><th>Obs.</th><th></th></tr></thead>
              <tbody>{pagos.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.nome}<div style={{ fontSize: 11, color: "var(--text2)" }}>{f.telefone}</div></td>
                  <td style={{ fontWeight: 700, color: "var(--green)" }}>{formatBRL(f.totalPago || f.valor)}</td>
                  <td><span className="badge badge-blue">{FORMA_EMOJI[f.formaPagamento]} {FORMA_LABEL[f.formaPagamento]}</span></td>
                  <td><span className="badge badge-green">✓ {formatData(f.dataPagamento)}</span></td>
                  <td style={{ color: "var(--text2)", fontSize: 12 }}>{f.observacoes || "—"}</td>
                  <td><button className="btn-icon danger" onClick={() => setConfirmId(f.id)}><Icon name="trash" /></button></td>
                </tr>
              ))}</tbody></table>
          }
        </div></div>
      )}

      {/* MODAL — Novo Fiado com Carrinho */}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo Fiado" wide>
        <form onSubmit={submit}>
          {/* Dados do cliente */}
          <div className="form-grid form-grid-2" style={{ marginBottom: 20 }}>
            <div className="input-group"><label className="input-label">Nome *</label><input className="input" placeholder="Ex: Ana Lima" value={meta.nome} onChange={e => setM("nome", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Telefone / WhatsApp</label><input className="input" placeholder="(11) 99999-9999" value={meta.telefone} onChange={e => setM("telefone", e.target.value)} /></div>
            <div className="input-group"><label className="input-label">Data</label><input className="input" type="date" value={meta.data} onChange={e => setM("data", e.target.value)} /></div>
            <div className="input-group">
              <label className="input-label">Forma de Pagamento Combinada</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {[{ value: "pix", label: "💠 Pix" }, { value: "dinheiro", label: "💵 Dinheiro" }, { value: "cartao", label: "💳 Cartão" }, { value: "transferencia", label: "🏦 Transf." }].map(op => (
                  <div key={op.value} className={`tag-opt ${meta.formaPagamento === op.value ? "selected" : ""}`} onClick={() => setM("formaPagamento", op.value)}>{op.label}</div>
                ))}
              </div>
            </div>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}><label className="input-label">Observações</label><textarea className="input" placeholder="Detalhes adicionais..." value={meta.observacoes} onChange={e => setM("observacoes", e.target.value)} style={{ minHeight: 50 }} /></div>
          </div>

          {/* Carrinho de itens */}
          <SeletorItemVenda dados={dados} onAdicionarItem={item => setItens(p => [...p, item])} estoqueReservado={estoqueReservado} />

          <div className="cart-section" style={{ marginTop: 0 }}>
            <div className="cart-section-title">🤝 Itens do Fiado ({itens.length})</div>
            {itens.length === 0
              ? <div className="cart-empty">Nenhum item ainda. Selecione um produto acima e clique em <strong>Adicionar ao Carrinho</strong>.</div>
              : <>
                {itens.map(i => (
                  <div key={i.id} className="cart-item-row">
                    <span className="cart-item-name">{i.label}</span>
                    <span className="cart-item-qty">{i.quantidade}x {formatBRL(i.precoUnit)}</span>
                    <span className="cart-item-price">{formatBRL(i.subtotal)}</span>
                    <button type="button" className="btn-icon danger" onClick={() => removerItem(i.id)}><Icon name="trash" /></button>
                  </div>
                ))}
                <div className="cart-total-row">
                  <span className="cart-total-label">Total do Fiado</span>
                  <span className="cart-total-value">{formatBRL(totalCarrinho)}</span>
                </div>
              </>
            }
          </div>

          <div className="info-box" style={{ marginTop: 14 }}>
            📦 O estoque será <strong>baixado imediatamente</strong>. O valor só entra no faturamento quando marcado como <strong>Recebido</strong>.
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={itens.length === 0 || !meta.nome.trim()}>
              <Icon name="check" />Registrar Fiado {itens.length > 0 && `— ${formatBRL(totalCarrinho)}`}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Remover registro?" text="Permanentemente." danger
        onConfirm={() => { onRemover(confirmId); setConfirmId(null); toast("Removido"); }}
        onCancel={() => setConfirmId(null)} />

      {/* MODAL — Pagamento Parcial */}
      <Modal open={!!modalParcial} onClose={() => setModalParcial(null)} title={`💰 Receber Parcial — ${modalParcial?.nome || ""}`}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>Valor total em aberto:</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "var(--red)" }}>
            {formatBRL(modalParcial?.valor || 0)}
          </div>
          {modalParcial?.totalPago > 0 && (
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
              Já recebido anteriormente: <strong style={{ color: "var(--green)" }}>{formatBRL(modalParcial.totalPago)}</strong>
            </div>
          )}
        </div>
        <div className="input-group" style={{ marginBottom: 16 }}>
          <label className="input-label">Valor recebido agora (R$) *</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0.01"
            max={modalParcial?.valor}
            placeholder="0,00"
            value={valorParcial}
            onChange={e => setValorParcial(e.target.value)}
            autoFocus
          />
          {valorParcial && parseFloat(valorParcial) > 0 && parseFloat(valorParcial) < (modalParcial?.valor || 0) && (
            <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "rgba(77,166,255,0.07)", border: "1px solid rgba(77,166,255,0.2)", fontSize: 13 }}>
              Restará: <strong style={{ color: "var(--red)" }}>{formatBRL((modalParcial?.valor || 0) - parseFloat(valorParcial))}</strong>
            </div>
          )}
          {valorParcial && parseFloat(valorParcial) >= (modalParcial?.valor || 0) && (
            <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "rgba(62,207,142,0.07)", border: "1px solid rgba(62,207,142,0.2)", fontSize: 13, color: "var(--green)", fontWeight: 700 }}>
              ✓ Fiado será quitado completamente!
            </div>
          )}
        </div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setModalParcial(null)}>Cancelar</button>
          <button
            className="btn btn-success"
            disabled={!valorParcial || parseFloat(valorParcial) <= 0}
            onClick={() => {
              const v = parseFloat(valorParcial);
              if (!v || v <= 0) return toast("Informe um valor válido", "error");
              onPagarParcial(modalParcial.id, v);
              setModalParcial(null);
              setValorParcial("");
            }}
          >
            <Icon name="check" />Confirmar Recebimento
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
const NAV_BASE = [
  { id: "painel", label: "Painel", icon: "dashboard", group: "Principal" },
  { id: "venda", label: "Nova Venda", icon: "sell", group: "Principal" },
  { id: "despesa", label: "Nova Despesa", icon: "expense", group: "Principal" },
  { id: "transacoes", label: "Transações", icon: "categories", group: "Dados" },
  { id: "estoque", label: "Estoque", icon: "stock", group: "Dados" },
  { id: "encomendas", label: "Encomendas", icon: "inbox", group: "Dados" },
  { id: "fiado", label: "Fiado / Cobranças", icon: "warn", group: "Dados" },
  { id: "clientes", label: "Clientes", icon: "clients", group: "Dados" },
  { id: "fornecedores", label: "Fornecedores", icon: "handshake", group: "Dados" },
  { id: "categorias", label: "Categorias", icon: "categories", group: "Dados" },
  { id: "relatorio", label: "Relatório PDF", icon: "pdf", group: "Dados" },
];

function Sidebar({ page, onNavigate, open, onClose }) {
  const navItems = NAV_BASE;
  const groups = [...new Set(navItems.map(i => i.group))];
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-img"><img src={logoImg} alt="LF Games" /></div>
          <div><div className="logo-name">LF GAMES</div><div className="logo-sub">Gestão</div></div>
        </div>
        <nav className="sidebar-nav">
          {groups.map(g => (
            <div key={g}>
              <div className="nav-label">{g}</div>
              {navItems.filter(i => i.group === g).map(item => (
                <div key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { onNavigate(item.id); onClose(); }}>
                  <Icon name={item.icon} size={16} />{item.label}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", padding: "4px 12px 8px", fontSize: 11, color: "var(--text2)" }}>
            <Icon name="sync" size={12} /><span style={{ marginLeft: 6 }}>Firebase — tempo real</span><div className="sync-dot" />
          </div>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────
// FIREBASE HOOKS
// ─────────────────────────────────────────────
const CATEGORIAS_PADRAO = [
  { id: "c1", nome: "Vendas", tipo: "receita", cor: "#3ecf8e" },
  { id: "c2", nome: "Serviços", tipo: "receita", cor: "#4da6ff" },
  { id: "c3", nome: "Aluguel", tipo: "despesa", cor: "#f06060" },
  { id: "c4", nome: "Fornecedores", tipo: "despesa", cor: "#f5a623" },
  { id: "c5", nome: "Funcionários", tipo: "despesa", cor: "#a78bfa" },
  { id: "c6", nome: "Utilidades", tipo: "despesa", cor: "#22d3ee" },
];

// Categorias de produto (loja de games)
const CATEGORIAS_PRODUTO = [
  "PlayStation", "Xbox", "Nintendo", "PC Gamer", "Jogos", "Controles",
  "Headsets", "Mouse", "Teclados", "Cadeiras", "Gift Cards", "Cabos",
  "Acessórios", "Colecionáveis",
];

// Consoles / plataformas
const CONSOLES_PRODUTO = [
  "PlayStation 5", "PlayStation 4", "PlayStation 1,2,3", "Xbox Series X/S", "Xbox One",
  "Xbox 360", "Xbox Clássico", "Nintendo Switch", "Nintendo Switch 2", "Nintendo 64",
  "Super Nintendo SNES", "Nintendo NES", "Wii", "Wii U", "Mega Drive", "Master Sistem",
  "Sega Saturn", "Dreamcast", "Atari", "Dynavision", "PC", "Multiplataforma", "Não se aplica",
];

// Condição do produto
const CONDICOES_PRODUTO = ["Novo", "Seminovo", "Usado"];

function corCondicao(c) {
  if (c === "Novo") return "badge-green";
  if (c === "Seminovo") return "badge-gold";
  return "badge-yellow";
}

function useCollection(colName) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, colName), snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [colName]);
  return [items, loading];
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("painel");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUsuario(u);
        setAuthLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
        } catch {
          setAuthLoading(false);
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const [transacoes, loadingT] = useCollection("transacoes");
  const [produtos, loadingP] = useCollection("produtos");
  const [clientes, loadingC] = useCollection("clientes");
  const [categorias, loadingCat] = useCollection("categorias");
  const [variantesProduto, loadingVP] = useCollection("variantesProduto");
  const [compras, loadingCo] = useCollection("compras");
  const [encomendas, loadingEn] = useCollection("encomendas");
  const [fiados, loadingFi] = useCollection("fiados");
  const [fornecedores, loadingFo] = useCollection("fornecedores");

  const loading = loadingT || loadingP || loadingC || loadingCat || loadingVP || loadingCo || loadingEn || loadingFi || loadingFo;

  useEffect(() => {
    if (!loadingCat && categorias.length === 0) {
      CATEGORIAS_PADRAO.forEach(c => setDoc(doc(db, "categorias", c.id), c));
    }
  }, [loadingCat, categorias.length]);

  const dados = { transacoes, produtos, clientes, categorias, variantesProduto, compras, encomendas, fiados, fornecedores };

  // Fornecedores
  async function adicionarFornecedor(f) { const id = uid(); await setDoc(doc(db, "fornecedores", id), { ...f, id, dataCriacao: new Date().toISOString() }); }
  async function atualizarFornecedor(id, upd) { const f = fornecedores.find(x => x.id === id); if (f) await setDoc(doc(db, "fornecedores", id), { ...f, ...upd }); }
  async function removerFornecedor(id) { await deleteDoc(doc(db, "fornecedores", id)); }

  // Compras
  async function adicionarCompra(c) { const id = uid(); await setDoc(doc(db, "compras", id), { ...c, id, criadoEm: new Date().toISOString() }); }
  async function receberCompra(id) {
    const c = compras.find(x => x.id === id);
    if (c) await setDoc(doc(db, "compras", id), { ...c, status: "recebido", dataRecebimento: hojeLocal() });
    toast("Marcado como recebido! ✓");
  }
  async function removerCompra(id) { await deleteDoc(doc(db, "compras", id)); }

  // Encomendas
  async function adicionarEncomenda(e) { const id = uid(); await setDoc(doc(db, "encomendas", id), { ...e, id, criadoEm: new Date().toISOString() }); }
  async function atualizarEncomenda(id, upd) { const e = encomendas.find(x => x.id === id); if (e) await setDoc(doc(db, "encomendas", id), { ...e, ...upd }); }
  async function removerEncomenda(id) { await deleteDoc(doc(db, "encomendas", id)); }

  // Fiado
  async function adicionarFiado(f) {
    const id = uid();
    await setDoc(doc(db, "fiados", id), { ...f, id, criadoEm: new Date().toISOString() });
    // Baixa estoque de todos os itens do carrinho
    const itensFiado = f.itens && f.itens.length > 0 ? f.itens : [];
    for (const item of itensFiado) {
      if (item.varianteId) {
        const variante = variantesProduto.find(v => v.id === item.varianteId);
        if (variante) await setDoc(doc(db, "variantesProduto", variante.id), { ...variante, estoque: Math.max(0, variante.estoque - item.quantidade) });
      } else if (item.produtoId) {
        const prod = produtos.find(p => p.id === item.produtoId);
        if (prod) await setDoc(doc(db, "produtos", prod.id), { ...prod, quantidadeEstoque: Math.max(0, prod.quantidadeEstoque - item.quantidade) });
      }
    }
  }
  async function pagarFiado(id) {
    const f = fiados.find(x => x.id === id);
    if (!f) return;
    await setDoc(doc(db, "fiados", id), { ...f, status: "pago", dataPagamento: hojeLocal() });
    // Só entra no faturamento quando pago
    const tId = uid();
    let descricao;
    if (f.itens && f.itens.length > 0) {
      descricao = `Fiado recebido — ${f.nome} (${f.itens.map(i => `${i.quantidade}x ${i.label}`).join(", ")})`;
    } else {
      const nomeProd = f.produtoId ? (produtos.find(p => p.id === f.produtoId)?.nome || "") : "";
      descricao = nomeProd ? `Fiado recebido — ${f.nome} (${f.quantidade || 1}x ${nomeProd})` : `Fiado recebido — ${f.nome}`;
    }
    await setDoc(doc(db, "transacoes", tId), {
      id: tId, tipo: "venda", descricao, valor: f.valor,
      cliente: f.nome, data: hojeLocal(), observacoes: f.observacoes || "",
      quantidade: f.quantidade || 1, fiadoId: id,
    });
    toast("Marcado como pago! Valor adicionado ao faturamento ✓");
  }
  async function removerFiado(id) { await deleteDoc(doc(db, "fiados", id)); }

  async function pagarParcialFiado(id, valorPago) {
    const f = fiados.find(x => x.id === id);
    if (!f) return;
    const valorRestante = Math.max(0, f.valor - valorPago);
    const totalJaPago = (f.totalPago || 0) + valorPago;

    // Atualiza o fiado — abate o valor, registra histórico de parcelas
    const historico = f.historicoPagamentos || [];
    historico.push({ valor: valorPago, data: hojeLocal() });

    if (valorRestante <= 0) {
      // Quitou tudo — marca como pago
      await setDoc(doc(db, "fiados", id), { ...f, status: "pago", valor: 0, totalPago: totalJaPago, historicoPagamentos: historico, dataPagamento: hojeLocal() });
    } else {
      // Ainda tem saldo — atualiza valor restante
      await setDoc(doc(db, "fiados", id), { ...f, valor: valorRestante, totalPago: totalJaPago, historicoPagamentos: historico });
    }

    // Registra a parcela como transação no faturamento
    const tId = uid();
    const descricao = `Fiado parcial recebido — ${f.nome} (${valorRestante > 0 ? `resta ${formatBRL(valorRestante)}` : "quitado"})`;
    await setDoc(doc(db, "transacoes", tId), {
      id: tId, tipo: "venda", descricao, valor: valorPago,
      cliente: f.nome, data: hojeLocal(), observacoes: f.observacoes || "",
      quantidade: 1, fiadoId: id,
    });

    if (valorRestante <= 0) {
      toast("Fiado quitado! Valor adicionado ao faturamento ✓");
    } else {
      toast(`Parcial de ${formatBRL(valorPago)} recebido! Resta ${formatBRL(valorRestante)} ✓`);
    }
  }

  // Venda com carrinho (múltiplos itens)
  async function adicionarVendaCarrinho(payload) {
    const { itens, descricao, valor, cliente, categoria, data, observacoes } = payload;
    // Baixa o estoque de cada item
    for (const item of itens) {
      if (item.varianteId) {
        const variante = variantesProduto.find(v => v.id === item.varianteId);
        if (variante) await setDoc(doc(db, "variantesProduto", variante.id), { ...variante, estoque: Math.max(0, variante.estoque - item.quantidade) });
      } else if (item.produtoId) {
        const prod = produtos.find(p => p.id === item.produtoId);
        if (prod) await setDoc(doc(db, "produtos", prod.id), { ...prod, quantidadeEstoque: Math.max(0, prod.quantidadeEstoque - item.quantidade) });
      }
    }
    // Registra uma única transação com a descrição completa
    const id = uid();
    await setDoc(doc(db, "transacoes", id), {
      id, tipo: "venda", descricao, valor, cliente: cliente || "", categoria: categoria || "",
      data: data || hojeLocal(), observacoes: observacoes || "",
      quantidade: itens.reduce((s, i) => s + i.quantidade, 0),
      itens,
    });
    toast(`Venda finalizada! ${itens.length} item(s) — ${formatBRL(valor)} ✓`);
    setPage("transacoes");
  }

  // Transações
  async function adicionarTransacao(t) {
    const id = uid();
    const novaT = { ...t, id, data: t.data || hojeLocal() };
    if (t.produtoId && t.tipo === "venda") {
      if (t.varianteId) {
        const variante = variantesProduto.find(v => v.id === t.varianteId);
        if (variante) await setDoc(doc(db, "variantesProduto", variante.id), { ...variante, estoque: Math.max(0, variante.estoque - t.quantidade) });
      } else {
        const prod = produtos.find(p => p.id === t.produtoId);
        if (prod) await setDoc(doc(db, "produtos", prod.id), { ...prod, quantidadeEstoque: Math.max(0, prod.quantidadeEstoque - t.quantidade) });
      }
    }
    await setDoc(doc(db, "transacoes", id), novaT);
    toast(t.tipo === "venda" ? "Venda registrada! ✓" : "Despesa registrada! ✓");
    setPage("transacoes");
  }
  async function removerTransacao(id) { await deleteDoc(doc(db, "transacoes", id)); }

  // Clientes
  async function adicionarCliente(c) { const id = uid(); await setDoc(doc(db, "clientes", id), { ...c, id, dataCriacao: new Date().toISOString() }); }
  async function removerCliente(id) { await deleteDoc(doc(db, "clientes", id)); }
  async function atualizarCliente(id, upd) { const c = clientes.find(x => x.id === id); if (c) await setDoc(doc(db, "clientes", id), { ...c, ...upd }); }

  // Categorias
  async function adicionarCategoria(c) { const id = uid(); await setDoc(doc(db, "categorias", id), { ...c, id }); }
  async function removerCategoria(id) { await deleteDoc(doc(db, "categorias", id)); }

  // Produtos
  async function adicionarProduto(p) { const id = uid(); await setDoc(doc(db, "produtos", id), { ...p, id, dataCriacao: new Date().toISOString() }); }
  async function removerProduto(id) {
    await deleteDoc(doc(db, "produtos", id));
    const vars = variantesProduto.filter(v => v.produtoPaiId === id);
    for (const v of vars) await deleteDoc(doc(db, "variantesProduto", v.id));
  }
  async function atualizarProduto(id, upd) { const p = produtos.find(x => x.id === id); if (p) await setDoc(doc(db, "produtos", id), { ...p, ...upd }); }

  // Variantes
  async function adicionarVariante(v) { const id = uid(); await setDoc(doc(db, "variantesProduto", id), { ...v, id, criadoEm: new Date().toISOString() }); }
  async function removerVariante(id) { await deleteDoc(doc(db, "variantesProduto", id)); }
  async function atualizarVariante(id, upd) { const v = variantesProduto.find(x => x.id === id); if (v) await setDoc(doc(db, "variantesProduto", id), { ...v, ...upd }); }

  if (showSplash || authLoading) return (
    <>
      <style>{CSS}</style>
      <SplashScreen />
    </>
  );
  if (loading) return (<><style>{CSS}</style><div className="loading-screen"><div className="spinner" /><p style={{ color: "var(--text2)", fontSize: 13 }}>Carregando dados...</p></div></>);

  function renderPage() {
    if (page === "painel") return <Dashboard dados={dados} />;
    if (page === "venda") return (
      <div>
        <div className="page-header"><div><h1 className="page-title">Nova Venda</h1><p className="page-sub">Monte o carrinho e finalize a venda</p></div></div>
        <CarrinhoVenda dados={dados} onSalvar={adicionarVendaCarrinho} onCancelar={() => setPage("painel")} />
      </div>
    );
    if (page === "despesa") return (
      <div>
        <div className="page-header"><div><h1 className="page-title">Registrar Despesa</h1><p className="page-sub">Adicione uma nova despesa</p></div></div>
        <div className="card"><div className="card-body"><FormTransacao tipo="despesa" dados={dados} onSalvar={adicionarTransacao} onCancelar={() => setPage("painel")} /></div></div>
      </div>
    );
    if (page === "transacoes") return <Transacoes dados={dados} onRemover={removerTransacao} />;
    if (page === "estoque") return <Estoque dados={dados} onAdicionar={adicionarProduto} onRemover={removerProduto} onAtualizar={atualizarProduto} onAdicionarVariante={adicionarVariante} onRemoverVariante={removerVariante} onAtualizarVariante={atualizarVariante} />;
    if (page === "clientes") return <Clientes dados={dados} onAdicionar={adicionarCliente} onRemover={removerCliente} onAtualizar={atualizarCliente} />;
    if (page === "fornecedores") return <Fornecedores dados={dados} onAdicionar={adicionarFornecedor} onRemover={removerFornecedor} onAtualizar={atualizarFornecedor} />;
    if (page === "categorias") return <Categorias dados={dados} onAdicionar={adicionarCategoria} onRemover={removerCategoria} />;
    if (page === "relatorio") return <RelatorioPDF dados={dados} />;
    if (page === "compras") return <Compras compras={compras} fornecedores={fornecedores} onAdicionar={adicionarCompra} onReceber={receberCompra} onRemover={removerCompra} />;
    if (page === "encomendas") return <Encomendas encomendas={encomendas} onAdicionar={adicionarEncomenda} onAtualizar={atualizarEncomenda} onRemover={removerEncomenda} />;
    if (page === "fiado") return <Fiado fiados={fiados} onAdicionar={adicionarFiado} onPagar={pagarFiado} onPagarParcial={pagarParcialFiado} onRemover={removerFiado} dados={dados} />;

  }

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="mobile-navbar">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}><Icon name="menu" size={18} /></button>
          <div className="mobile-logo">
            <div className="mobile-logo-img"><img src={logoImg} alt="Logo" /></div>
            <span className="mobile-logo-name">LF GAMES</span>
          </div>
        </div>
        <Sidebar page={page} onNavigate={setPage} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main"><div className="page">{renderPage()}</div></main>
      </div>
      <ToastContainer />
    </>
  );
}
