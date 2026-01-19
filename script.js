const API_URL = '/api';

// Configuração inicial das categorias
const categories = {
    lead: { title: 'Instalação', color: '#007bff' },
    prospect: { title: 'Suporte', color: '#28a745' },
    inNegotiation: { title: 'Pagamento', color: '#ffc107' },
    closed: { title: 'Cancelamento', color: '#dc3545' },
    lost: { title: 'Outros', color: '#17a2b8' }
};

// Variável para armazenar a referência do modal
let formModal;

// Inicializar o layout
async function initializeLayout() {
    const container = document.getElementById('categoriesContainer');

    Object.keys(categories).forEach(categoryKey => {
        const column = document.createElement('div');
        column.className = 'col-md-4 col-lg-2';
        column.innerHTML = `
            <div class="category-column category-${categoryKey}">
                <div class="category-title">${categories[categoryKey].title}</div>
                <div id="${categoryKey}-items"></div>
            </div>
        `;
        container.appendChild(column);
    });

    // Inicializar o modal
    formModal = new bootstrap.Modal(document.getElementById('formModal'));

    // Carregar itens salvos do Servidor
    await loadItems();
}

// Função para abrir/fechar o formulário
function toggleForm() {
    formModal.show();
}

// Adicionar novo item
async function addItem() {
    const title = document.getElementById('itemTitle').value;
    const description = document.getElementById('itemDescription').value;
    const category = document.getElementById('itemCategory').value;

    if (!title || !description) {
        alert('Por favor, preencha todos os campos!');
        return;
    }

    const item = {
        id: Date.now(),
        title,
        description,
        category
    };

    try {
        const response = await fetch(`${API_URL}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });

        if (response.ok) {
            createItemCard(item);
            // Limpar formulário e fechar modal
            document.getElementById('itemTitle').value = '';
            document.getElementById('itemDescription').value = '';
            formModal.hide();
        }
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        alert('Erro ao conectar com o servidor.');
    }
}

// Criar card do item
function createItemCard(item) {
    const card = document.createElement('div');
    card.className = `item-card card-${item.category}`;
    card.setAttribute('draggable', 'true');
    card.id = `item-${item.id}`;
    card.innerHTML = `
        <div class="item-title">${item.title}</div>
        <div class="item-description">${item.description}</div>
        <div class="mt-2">
            <button class="btn btn-sm btn-light" onclick="deleteItem(${item.id})">Excluir</button>
        </div>
    `;

    // Adicionar evento de drag and drop
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.id);
    });

    const categoryContainer = document.getElementById(`${item.category}-items`);
    categoryContainer.appendChild(card);
}

// Carregar itens do Servidor
async function loadItems() {
    try {
        const response = await fetch(`${API_URL}/items`);
        const items = await response.json();
        // Limpar containers antes de carregar
        Object.keys(categories).forEach(cat => {
            document.getElementById(`${cat}-items`).innerHTML = '';
        });
        items.forEach(item => createItemCard(item));
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
    }
}

// Deletar item
async function deleteItem(id) {
    if (!confirm('Tem certeza que deseja excluir?')) return;

    try {
        const response = await fetch(`${API_URL}/items/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            document.getElementById(`item-${id}`).remove();
        }
    } catch (error) {
        console.error('Erro ao deletar item:', error);
    }
}

// Inicializar quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    initializeLayout();

    // Adicionar eventos de drag and drop para as colunas
    document.querySelectorAll('.category-column').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            const itemId = parseInt(e.dataTransfer.getData('text/plain'));
            const newCategory = column.querySelector('div[id$="-items"]').id.split('-')[0];

            // Atualizar categoria no Servidor
            try {
                const response = await fetch(`${API_URL}/items/${itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category: newCategory })
                });

                if (response.ok) {
                    const card = document.getElementById(`item-${itemId}`);
                    // Extrair categoria antiga da classe
                    const oldCategory = Array.from(card.classList)
                        .find(c => c.startsWith('card-'))
                        .replace('card-', '');

                    card.classList.remove(`card-${oldCategory}`);
                    card.classList.add(`card-${newCategory}`);
                    document.getElementById(`${newCategory}-items`).appendChild(card);
                }
            } catch (error) {
                console.error('Erro ao mover item:', error);
            }
        });
    });
});
