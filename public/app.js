console.log("CRM Loaded: v2.1 (Conclude Feature)");
const API_URL = '/api';

const categories = {
    lead: { title: 'Instalação', color: '#007bff' },
    prospect: { title: 'Suporte', color: '#28a745' },
    inNegotiation: { title: 'Pagamento', color: '#ffc107' },
    closed: { title: 'Cancelamento', color: '#dc3545' },
    lost: { title: 'Outros', color: '#17a2b8' },
    done: { title: 'Concluídos', color: '#20c997' }
};

let formModal;

async function initializeLayout() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;

    Object.keys(categories).forEach(categoryKey => {
        const column = document.createElement('div');
        column.className = 'col-auto';
        column.innerHTML = `
            <div class="category-column px-4">
                <div class="category-title" style="border-left: 4px solid ${categories[categoryKey].color}; padding-left: 10px;">
                    ${categories[categoryKey].title}
                </div>
                <div id="${categoryKey}-items" class="h-100 pb-5"></div>
            </div>
        `;
        container.appendChild(column);
    });

    detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    formModal = new bootstrap.Modal(document.getElementById('formModal'));
    await loadItems();
    setupDragAndDrop();
}

function toggleForm() {
    formModal.show();
}

async function addItem() {
    const titleInput = document.getElementById('itemTitle');
    const descInput = document.getElementById('itemDescription');
    const catInput = document.getElementById('itemCategory');

    if (!titleInput.value || !descInput.value) {
        alert('Por favor, preencha todos os campos!');
        return;
    }

    const item = {
        id: Date.now(),
        title: titleInput.value,
        description: descInput.value,
        category: catInput.value
    };

    try {
        const response = await fetch(`${API_URL}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });

        if (response.ok) {
            createItemCard(item);
            titleInput.value = '';
            descInput.value = '';
            formModal.hide();
        } else {
            const err = await response.json();
            console.error('SERVER ERROR:', err);
            alert('Erro ao salvar: ' + (err.message || err.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        alert('Erro ao conectar com o servidor. Verifique o console.');
    }
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Global cache for items to support modal lookup
let allItems = [];
let detailModal;

function createItemCard(item) {
    const card = document.createElement('div');
    card.className = `item-card card-${item.category} animate-in`;
    card.setAttribute('draggable', 'true');
    card.id = `item-${item.id}`;

    // Minimalist Content: Just Title
    card.innerHTML = `
        <div class="item-title mb-0 text-truncate">${item.title}</div>
    `;

    // Click to open detail
    card.onclick = () => openDetail(item.id);

    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.id);
        card.style.opacity = '0.4';
    });

    card.addEventListener('dragend', () => {
        card.style.opacity = '1';
    });

    const categoryContainer = document.getElementById(`${item.category}-items`);
    if (categoryContainer) categoryContainer.appendChild(card);
}

function openDetail(id) {
    const item = allItems.find(i => i.id == id);
    if (!item) return;

    document.getElementById('d-title').textContent = item.title;
    document.getElementById('d-description').textContent = item.description;

    // Meta Info
    const created = item.created_at ? `📅 ${formatDate(item.created_at)}` : '';
    let completed = '';
    if (item.completed_by) {
        completed = ` | ✅ Concluído por ${item.completed_by} em ${formatDate(item.completed_at)}`;
    }
    document.getElementById('d-meta').textContent = created + completed;

    // Actions
    const actionContainer = document.getElementById('d-actions');
    actionContainer.innerHTML = '';

    if (item.category !== 'done' && item.category !== 'closed') {
        const btnConclude = document.createElement('button');
        btnConclude.className = 'btn btn-success fw-bold px-4';
        btnConclude.textContent = 'Concluir Atendimento';
        btnConclude.onclick = () => {
            detailModal.hide();
            concludeItem(item.id);
        };
        actionContainer.appendChild(btnConclude);
    }

    // Optional: Add Delete back strictly inside modal if desired, or keep it removed as per previous task.
    // User asked to remove it from card, maybe keeps it clean. Leaving out for now.

    detailModal.show();
}

async function concludeItem(id) {
    const name = prompt("Para concluir, digite seu NOME:");

    if (name === null) return;

    if (!name.trim()) {
        alert("É obrigatório informar o nome para concluir!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: 'done',
                completed_by: name.trim(),
                completed_at: new Date().toISOString()
            })
        });

        if (response.ok) {
            document.location.reload();
        } else {
            alert('Erro ao concluir item.');
        }
    } catch (error) {
        console.error('Erro ao concluir:', error);
    }
}

async function loadItems() {
    try {
        const response = await fetch(`${API_URL}/items`);
        const data = await response.json();

        if (!response.ok || !Array.isArray(data)) {
            console.error('Erro do Servidor:', data);
            const errorMsg = data.details || data.error || 'Erro desconhecido';

            const container = document.getElementById('categoriesContainer');
            if (container) {
                container.innerHTML = `
                    <div class="col-12 mt-4 px-4">
                         <div class="alert alert-danger glass-modal" style="border-left: 5px solid #dc3545">
                            <h4 class="alert-heading fw-bold">⚠️ Erro de Banco de Dados</h4>
                            <p>${errorMsg}</p>
                            <hr>
                            <p class="mb-0"><strong>Dica:</strong> Vá em <em>Settings -> Environment Variables</em> na Vercel, adicione <code>TURSO_DATABASE_URL</code> e <code>TURSO_AUTH_TOKEN</code>, e faça um "Redeploy".</p>
                        </div>
                    </div>
                `;
            }
            return;
        }

        Object.keys(categories).forEach(cat => {
            const container = document.getElementById(`${cat}-items`);
            if (container) container.innerHTML = '';
        });

        allItems = data; // Cache for modal
        data.forEach(item => createItemCard(item));
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
    }
}

async function deleteItem(id) {
    if (!confirm('Eliminar este registro permanentemente?')) return;

    try {
        const response = await fetch(`${API_URL}/items/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            const el = document.getElementById(`item-${id}`);
            if (el) el.remove();
        }
    } catch (error) {
        console.error('Erro ao deletar item:', error);
    }
}

function setupDragAndDrop() {
    document.querySelectorAll('.category-column').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            const itemId = parseInt(e.dataTransfer.getData('text/plain'));
            const itemsContainer = column.querySelector('div[id$="-items"]');
            const newCategory = itemsContainer.id.split('-')[0];

            if (newCategory === 'done') {
                alert("Use o botão 'Concluir' no card para mover para esta coluna.");
                return;
            }

            try {
                const response = await fetch(`${API_URL}/items/${itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category: newCategory })
                });

                if (response.ok) {
                    const card = document.getElementById(`item-${itemId}`);
                    if (!card) return;

                    const oldClasses = Array.from(card.classList).filter(c => c.startsWith('card-'));
                    oldClasses.forEach(c => card.classList.remove(c));
                    card.classList.add(`card-${newCategory}`);

                    itemsContainer.appendChild(card);
                }
            } catch (error) {
                console.error('Erro ao mover item:', error);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', initializeLayout);
