/* ═══════════════════════════════════════════════════════════════
   Inteligencia — agente de WhatsApp.
   (Las preguntas en lenguaje natural y los reportes pasaron a mod-bi.js.)
   El agente contesta con el inventario real: no es un guion.
   ═══════════════════════════════════════════════════════════════ */
(function (w) {
  "use strict";
  const D = w.DB, A = w.APP, S = w.S, U = w.UI;
  const { $, $$, esc, norm, grp, c, dec, fecha, hora, icon, tag, card, stat, table, bars, barRow, lineChart,
    openSheet, closeSheet, toast, locNom, cliNom, provNom, artOf, ini, empty } = U;

  /* ══ AGENTE DE WHATSAPP ══════════════════════════════════════ */
  A.screen("whatsapp", {
    title: "Agente de WhatsApp",
    sub: () => "Consulta el mismo inventario que la caja · 15 líneas, 3 400 clientes al mes",
    pad: "pad-tight",
    render(v) {
      const th = D.waThreads.find(t => t.id === S.waSel) || D.waThreads[0];
      S.waSel = th.id;
      v.innerHTML = `<div class="wrap">
        <div class="grid g4">
          ${stat("Conversaciones hoy", "142", { txt: "87 % resueltas sin que interviniera una persona", dir: "up" })}
          ${stat("Escaladas a una persona", "18", { txt: "monto alto, precio negociado o reclamo", dir: "" }, "var(--warn)")}
          ${stat("Pedidos creados por el agente", "23", { txt: c(2840000) + " en venta atendida", dir: "up" }, "var(--ok)")}
          ${stat("Transferencias validadas", "31", { txt: "comprobante leído y aplicado solo", dir: "" })}
        </div>
        <div class="split ancho" style="align-items:stretch;min-height:540px">
          ${card({
        body: `<div class="mut" style="font-size:12px;margin-bottom:6px">Conversaciones del día</div>
          <div class="mitems" style="max-height:none">${D.waThreads.map(t => `
            <button class="mitem" data-w="${t.id}" aria-selected="${t.id === th.id}" style="align-items:flex-start">
              <span class="avatar" style="margin-top:2px">${esc(ini(t.nom))}</span>
              <span style="flex:1;min-width:0"><span class="itd">${esc(t.nom)}</span>
                <span class="mut" style="font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.msgs[t.msgs.length - 1].t)}</span>
                <span style="margin-top:5px;display:inline-block">${tag(t.estado, t.estado.indexOf("Escalado") > -1 ? "wa" : "ok")}</span></span>
              <span class="dim num" style="font-size:11px">${esc(t.hora)}</span></button>`).join("")}</div>`
      })}
          <div class="card" style="display:flex;flex-direction:column;overflow:hidden">
            <div class="card-h" style="padding:15px 17px;border-bottom:1px solid var(--hair)">
              <span class="avatar">${esc(ini(th.nom))}</span>
              <div><h3 style="font-size:15px">${esc(th.nom)}</h3>
                <div class="mut num" style="font-size:12px">${esc(th.tel)}${th.clienteId ? " · " + esc(cliNom(th.clienteId)) : " · sin ficha de cliente"}</div></div>
              <div class="card-a">
                ${th.clienteId ? `<button class="btn sm" id="verCli">${icon("users")}Ver cliente</button>` : ""}
                <button class="btn sm" id="tomar">${icon("chat")}Tomar la conversación</button></div>
            </div>
            <div class="chat" style="flex:1;max-height:none">${th.msgs.map(m => m.de === "sys"
        ? `<div class="bub sys">${esc(m.t)}</div>`
        : `<div class="bub ${m.de}">${m.de === "bot" ? `<div class="botline">${icon("sparkle", 'style="width:12px;height:12px"')}Agente ServeCore</div>` : ""}${esc(m.t)}<span class="h">${esc(m.h)}</span></div>`).join("")}</div>
            <div style="padding:12px 15px;border-top:1px solid var(--hair);display:flex;gap:9px;align-items:center">
              <input class="inp" id="wamsg" style="flex:1" placeholder="Escriba como cliente y el agente responde con datos reales del sistema">
              <button class="btn pri" id="wasend">Enviar</button></div>
            <div style="padding:9px 15px;border-top:1px solid var(--hair-2);background:var(--surface-2);font-size:12.5px;color:var(--ink-3);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${icon("info", 'style="width:15px;height:15px"')}Pruebe: «tienen cemento», «precio de la lámina de zinc», «cuánto debo».</div>
          </div>
        </div></div>`;
      const ch = $(".chat", v);
      if (ch) ch.scrollTop = ch.scrollHeight;
    },
    wire(v) {
      $$("[data-w]", v).forEach(b => b.addEventListener("click", () => { S.waSel = b.dataset.w; A.refresh(); }));
      const vc = $("#verCli", v);
      if (vc) vc.addEventListener("click", () => {
        const t = D.waThreads.find(x => x.id === S.waSel);
        A.go("clientes", t.clienteId);
      });
      const t2 = $("#tomar", v);
      if (t2) t2.addEventListener("click", () => toast("Conversación tomada", "El agente deja de responder y avisa al cliente que sigue una persona.", "in"));
      const inp = $("#wamsg", v), snd = $("#wasend", v);
      function responder() {
        const q = inp.value.trim();
        if (!q) return;
        const th = D.waThreads.find(x => x.id === S.waSel);
        const h = hora(new Date());
        th.msgs.push({ de: "cli", t: q, h });
        th.msgs.push({ de: "bot", t: contestar(q, th), h });
        th.hora = h;
        A.refresh();
      }
      if (snd) snd.addEventListener("click", responder);
      if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") responder(); });
    }
  });

  function contestar(q, th) {
    const n = norm(q);
    const cli = th.clienteId ? D.cliById[th.clienteId] : null;
    if (/(debo|deuda|saldo|estado de cuenta)/.test(n)) {
      if (!cli || !cli.saldo) return "No tiene saldo pendiente con nosotros. Su última compra quedó al día.";
      const docs = D.documentos.filter(d => d.clienteId === cli.id && d.saldo > 0);
      return `Su saldo es de ${c(Math.round(cli.saldo))} en ${docs.length} documento(s). El más antiguo es ${docs.length ? docs[docs.length - 1].cons : "—"}. Puede pagar por SINPE al 8712-0000 o por transferencia; si me manda el comprobante lo aplico de una vez.`;
    }
    if (/(factura|comprobante|xml|pdf)/.test(n))
      return "Le reenvío al correo el XML y el PDF de sus últimos comprobantes. Si necesita uno específico, dígame el número y se lo mando.";
    if (/(horario|abren|cierran)/.test(n))
      return "Abrimos de lunes a viernes de 7:00 a.m. a 5:30 p.m., sábados de 7:00 a.m. a 4:00 p.m. y domingos de 8:00 a.m. a 12:00 m.d. en Santa Rosa y Turrialba.";
    if (/(entrega|transporte|flete|envio|envío)/.test(n))
      return "Sí hacemos entregas. A Turrialba centro el flete va desde ₡6 500 y a Pejibaye desde ₡12 000, según el peso. Dígame la dirección y el pedido y le confirmo el monto exacto.";
    if (/(corte|duplicado de llave|instalacion|mano de obra|taller)/.test(n)) {
      const s = D.articulos.filter(a => a.tipo === "Servicio");
      return `Sí, en el taller hacemos ${s.slice(0, 3).map(x => x.desc.toLowerCase() + " a " + c(x.precio)).join(", ")}. ¿Se lo agendo para hoy?`;
    }
    const tok = n.split(/\s+/).filter(x => x.length > 3);
    const arts = D.articulos.filter(a => tok.some(t => norm(a.desc + " " + a.sub + " " + a.marca).includes(t)));
    if (arts.length) {
      const a = arts[0];
      const disp = D.tiendas.map(l => ({ l, d: D.disp(a.id, l.id) })).filter(x => x.d > 0).sort((x, y) => y.d - x.d);
      const agot = D.tiendas.filter(l => D.disp(a.id, l.id) <= 0);
      let r = `${a.desc}, código ${a.cod}, a ${c(a.precio)}${a.peso ? " · pesa " + U.kg(a.peso) : ""}.`;
      if (disp.length) r += ` Disponible ahora: ${disp.slice(0, 3).map(x => x.l.nom + " " + x.d).join(" · ")}.`;
      if (agot.length) r += ` Agotado en ${agot.map(x => x.nom).join(", ")}, pero en el CEDI hay ${D.disp(a.id, "CD")} y se los bajamos mañana.`;
      if (arts.length > 1) r += ` También tengo ${arts.slice(1, 3).map(x => x.desc + " a " + c(x.precio)).join(" y ")}.`;
      if (cli && cli.limite) r += ` Su cuenta tiene crédito a ${cli.plazo} días con ${c(Math.round(cli.limite - cli.saldo))} disponibles. ¿Se lo aparto?`;
      return r;
    }
    return "No encontré ese artículo con ese nombre. ¿Me da el código o me describe para qué lo necesita? También puedo pasarle con un vendedor de piso.";
  }

})(window);
