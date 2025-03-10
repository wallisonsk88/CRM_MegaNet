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
function initializeLayout() {
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

    // Carregar itens salvos do localStorage
    loadItems();
}

// Função para abrir/fechar o formulário
function toggleForm() {
    formModal.show();
}

// Adicionar novo item
function addItem() {
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

    // Salvar no localStorage
    const items = getItems();
    items.push(item);
    localStorage.setItem('crmItems', JSON.stringify(items));

    // Adicionar item na interface
    createItemCard(item);

    // Limpar formulário e fechar modal
    document.getElementById('itemTitle').value = '';
    document.getElementById('itemDescription').value = '';
    formModal.hide();
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

// Carregar itens do localStorage
function loadItems() {
    const items = getItems();
    items.forEach(item => createItemCard(item));
}

// Obter itens do localStorage
function getItems() {
    const items = localStorage.getItem('crmItems');
    return items ? JSON.parse(items) : [];
}

// Deletar item
function deleteItem(id) {
    const items = getItems().filter(item => item.id !== id);
    localStorage.setItem('crmItems', JSON.stringify(items));
    document.getElementById(`item-${id}`).remove();
}

// Inicializar quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    initializeLayout();

    // Adicionar eventos de drag and drop para as colunas
    document.querySelectorAll('.category-column').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            const itemId = parseInt(e.dataTransfer.getData('text/plain'));
            const newCategory = column.querySelector('div[id$="-items"]').id.split('-')[0];

            // Atualizar categoria no localStorage
            const items = getItems();
            const itemIndex = items.findIndex(item => item.id === itemId);
            if (itemIndex !== -1) {
                const oldCategory = items[itemIndex].category;
                items[itemIndex].category = newCategory;
                localStorage.setItem('crmItems', JSON.stringify(items));

                // Mover o card para a nova coluna e atualizar sua cor
                const card = document.getElementById(`item-${itemId}`);
                card.classList.remove(`card-${oldCategory}`);
                card.classList.add(`card-${newCategory}`);
                document.getElementById(`${newCategory}-items`).appendChild(card);
            }
        });
    });
}); 