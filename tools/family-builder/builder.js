const form = document.getElementById('builder-form');
const sectionList = document.getElementById('section-list');
const message = document.getElementById('builder-message');
const output = document.getElementById('builder-output');
const generated = { plugin: '', family: '' };

function refreshSectionCount() {
  document.getElementById('section-count').textContent = `(${sectionList.children.length})`;
}

function invalidate() {
  output.hidden = true;
  message.textContent = '';
  generated.plugin = '';
  generated.family = '';
}

const nameInput = document.getElementById('family-name');
const idInput = document.getElementById('family-id');
nameInput.addEventListener('input', () => {
  if (idInput.dataset.edited !== 'true') {
    idInput.value = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[^a-z]+/, '') || '';
  }
});
idInput.addEventListener('input', () => { idInput.dataset.edited = 'true'; });

document.getElementById('add-section').addEventListener('click', () => {
  const row = document.createElement('div');
  row.className = 'section-row';
  row.innerHTML = '<div class="builder-field"><label>Section x<input class="section-x" required placeholder="x(t)"></label></div><div class="builder-field"><label>Section y<input class="section-y" required placeholder="y(t)"></label></div><button type="button" class="builder-button remove-section" aria-label="Remove section"><i class="fa-solid fa-xmark" aria-hidden="true"></i> Remove</button>';
  row.querySelector('.remove-section').addEventListener('click', () => { row.remove(); refreshSectionCount(); invalidate(); });
  sectionList.append(row);
  refreshSectionCount();
  invalidate();
});

form.addEventListener('input', invalidate);

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const value = key => String(data.get(key) || '').trim();
  const sections = [...sectionList.children].map(row => ({
    x: row.querySelector('.section-x').value.trim(),
    y: row.querySelector('.section-y').value.trim()
  }));
  if (sections.some(section => !section.x || !section.y)) {
    message.classList.add('error');
    message.textContent = 'Each section needs both x and y coordinates.';
    return;
  }
  const id = value('id');
  const name = value('name');
  const rank = value('rank');
  const plugin = {
    schema_version: 1,
    plugin_type: 'family',
    id,
    name,
    version: value('version'),
    description: value('description'),
    enabled_by_default: false,
    validation_parameter: value('validation'),
    family: { kind: 'json', file: 'family.json' },
    capabilities: ['candidate_generation']
  };
  const family = {
    name,
    parameter: value('parameter'),
    generic_rank: rank === '' ? null : Number(rank),
    a_invariants: ['a1', 'a2', 'a3', 'a4', 'a6'].map(value),
    sections
  };
  generated.plugin = JSON.stringify(plugin, null, 2) + '\n';
  generated.family = JSON.stringify(family, null, 2) + '\n';
  document.getElementById('plugin-preview').textContent = generated.plugin;
  document.getElementById('family-preview').textContent = generated.family;
  message.classList.remove('error');
  message.textContent = `Ready: plugins/families/${id}/`;
  output.hidden = false;
  output.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function download(filename, contents) {
  if (!contents) return;
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById('download-plugin').addEventListener('click', () => download('plugin.json', generated.plugin));
document.getElementById('download-family').addEventListener('click', () => download('family.json', generated.family));
