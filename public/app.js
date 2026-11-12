const form = document.querySelector('#circuit-form');
const results = document.querySelector('#results');
const emptyState = document.querySelector('#empty-state');
const resultStatus = document.querySelector('#result-status');
const formError = document.querySelector('#form-error');
const historyContent = document.querySelector('#history-content');
const calculateButton = form.querySelector('button[type="submit"]');

const labels = {
  resistencia: 'Resistencia',
  inductor: 'Inductor',
  capacitor: 'Capacitor'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function getInput() {
  const data = new FormData(form);
  return {
    topologia: data.get('topologia'),
    resistencia: Number(data.get('resistencia')),
    inductancia: Number(data.get('inductancia')),
    capacitancia: Number(data.get('capacitancia')),
    frecuencia: Number(data.get('frecuencia')),
    tension: Number(data.get('tension')),
    angulo: Number(data.get('angulo'))
  };
}

function phasorCell(phasor, unit) {
  return `<span>${escapeHtml(phasor.rectangular)} <small>${unit}</small></span><span>${escapeHtml(phasor.polar)} <small>${unit}</small></span>`;
}

function renderResults(result, saved) {
  const componentRows = Object.entries(result.componentes).map(([name, values]) => `
    <tr>
      <td>${labels[name]}</td>
      <td>${phasorCell(values.corriente, 'A')}</td>
      <td>${phasorCell(values.tension, 'V')}</td>
    </tr>`).join('');

  emptyState.hidden = true;
  results.hidden = false;
  resultStatus.textContent = 'CALCULADO';
  resultStatus.className = 'status-pill ready';
  results.innerHTML = `
    <div class="result-summary">
      <div class="summary-card"><span>Corriente total</span><strong>${escapeHtml(result.corrienteTotal.polar)} A</strong></div>
      <div class="summary-card"><span>Impedancia equivalente</span><strong>${escapeHtml(result.impedanciaEquivalente.polar)} Ω</strong></div>
    </div>
    <table class="result-table">
      <thead><tr><th>Elemento</th><th>Corriente · A<br><small>Rectangular / Polar</small></th><th>Tension · V<br><small>Rectangular / Polar</small></th></tr></thead>
      <tbody>
        <tr><td>Fuente</td><td>${phasorCell(result.corrienteTotal, 'A')}</td><td>${phasorCell(result.tensionFuente, 'V')}</td></tr>
        ${componentRows}
      </tbody>
    </table>
    <p class="saved-note ${saved ? '' : 'unsaved'}">${saved ? '✓ Calculo guardado en MySQL.' : 'Calculo listo, pero no se pudo guardar en MySQL.'}</p>`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

async function loadHistory() {
  historyContent.innerHTML = '<p class="history-message">Cargando historial...</p>';
  try {
    const response = await fetch('/api/history?limit=10');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar el historial.');
    if (data.calculos.length === 0) {
      historyContent.innerHTML = '<p class="history-message">Todavia no hay calculos guardados.</p>';
      return;
    }

    const rows = data.calculos.map(item => `
      <tr>
        <td>${escapeHtml(formatDate(item.creado_en))}</td>
        <td><span class="topology-tag">${escapeHtml(item.topologia)}</span></td>
        <td>${escapeHtml(item.frecuencia_hz)} Hz</td>
        <td>${escapeHtml(item.tension_rms_v)} ∠ ${escapeHtml(item.angulo_tension_deg)}° V</td>
        <td>${escapeHtml(item.resultado.corrienteTotal.polar)} A</td>
      </tr>`).join('');
    historyContent.innerHTML = `
      <table class="history-table">
        <thead><tr><th>Fecha</th><th>Topologia</th><th>Frecuencia</th><th>Tension fuente</th><th>Corriente total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (error) {
    historyContent.innerHTML = `<p class="history-message">${escapeHtml(error.message)} Inicia MySQL y revisa la configuracion.</p>`;
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  formError.hidden = true;
  calculateButton.disabled = true;
  calculateButton.textContent = 'Calculando...';
  resultStatus.textContent = 'CALCULANDO';
  resultStatus.className = 'status-pill';

  const input = getInput();
  try {
    const response = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo calcular el circuito.');

    let saved = false;
    try {
      const saveResponse = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const saveData = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saveData.error || 'No se pudo guardar el calculo.');
      saved = true;
    } catch (error) {
      console.error(error);
    }
    renderResults(data.resultado, saved);
    if (saved) loadHistory();
  } catch (error) {
    resultStatus.textContent = 'ERROR';
    resultStatus.className = 'status-pill error';
    formError.textContent = error.message;
    formError.hidden = false;
  } finally {
    calculateButton.disabled = false;
    calculateButton.innerHTML = '<span aria-hidden="true">↗</span> Calcular circuito';
  }
});

document.querySelector('#refresh-history').addEventListener('click', loadHistory);
loadHistory();
