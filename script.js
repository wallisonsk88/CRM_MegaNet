const API_URL = '/api';

const categories = {
    lead: { title: 'Instalação', color: '#007bff' },
    prospect: { title: 'Suporte', color: '#28a745' },
    inNegotiation: { title: 'Pagamento', color: '#ffc107' },
    closed: { title: 'Cancelamento', color: '#dc3545' },
    lost: { title: 'Outros', color: '#17a2b8' }
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
                <div class="category-title">${categories[categoryKey].title}</div>
                <div id="${categoryKey}-items" class="h-100 pb-5"></div>
            </div>
        `;
        container.appendChild(column);
    });

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
            alert('Erro ao salvar: ' + (err.details || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        alert('Erro ao conectar com o servidor. Verifique o console.');
    }
}

function createItemCard(item) {
    const card = document.createElement('div');
    card.className = `item-card card-${item.category} animate-in`;
    card.setAttribute('draggable', 'true');
    card.id = `item-${item.id}`;
    card.innerHTML = `
        <div class="item-title">${item.title}</div>
        <div class="item-description">${item.description}</div>
        <button class="btn-delete" onclick="deleteItem(${item.id})">Remover</button>
    `;

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

async function loadItems() {
    try {
        const response = await fetch(`${API_URL}/items`);
        if (!response.ok) throw new Error('Não foi possível carregar os dados');

        const items = await response.json();

        Object.keys(categories).forEach(cat => {
            const container = document.getElementById(`${cat}-items`);
            if (container) container.innerHTML = '';
        });

        items.forEach(item => createItemCard(item));
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

            try {
                const response = await fetch(`${API_URL}/items/${itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category: newCategory })
                });

                if (response.ok) {
                    const card = document.getElementById(`item-${itemId}`);
                    if (!card) return;

                    // Remove existing class and add new one
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
