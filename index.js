const API = (() => {
  const URL = "http://localhost:3000";

  const fetchInventory = () => fetch(`${URL}/inventory`).then(response => response.json());
  const fetchCart = () => fetch(`${URL}/cart`).then(response => response.json());
  const addToCart = (item) => fetch(`${URL}/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  }).then(response => response.json());

  const updateCartItem = (id, quantity) => fetch(`${URL}/cart/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity })
  }).then(response => response.json());

  const deleteCartItem = (id) => fetch(`${URL}/cart/${id}`, { method: 'DELETE' }).then(response => response.json());
  const checkoutCart = () => fetch(`${URL}/cart`, { method: 'DELETE' }).then(response => response.json());

  return {
    fetchInventory,
    fetchCart,
    addToCart,
    updateCartItem,
    deleteCartItem,
    checkoutCart
  };
})();

const Model = (() => {
  class State {
    #onChange;
    #inventory = [];
    #cart = [];

    get cart() {
      return this.#cart;
    }

    get inventory() {
      return this.#inventory;
    }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange();
    }

    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange();
    }

    subscribe(cb) {
      this.#onChange = cb;
    }
  }

  const state = new State();

  return {
    state,
    fetchInventory: API.fetchInventory,
    fetchCart: API.fetchCart,
    addToCart: API.addToCart,
    updateCartItem: API.updateCartItem,
    deleteCartItem: API.deleteCartItem,
    checkoutCart: API.checkoutCart
  };
})();

const View = (() => {
  const renderInventory = (inventory) => {
    const inventoryContainer = document.querySelector('.inventory-container');
    inventoryContainer.innerHTML = `
      <h1>Inventory</h1>
      ${inventory.map(item => `
        <div class="item" data-id="${item.id}">
          <span class="name">${item.name}</span>
          <button class="decrease">-</button>
          <span class="quantity">${item.selectedQuantity || 0}</span>
          <button class="increase">+</button>
          <button class="add-to-cart">Add to Cart</button>
        </div>
      `).join('')}
    `;
  };

  const renderCart = (cart) => {
    const cartContainer = document.querySelector('.cart-items');
    cartContainer.innerHTML = `
      ${cart.map(item => `
        <li data-id="${item.id}">
          ${item.name} x ${item.quantity}
          <button class="delete-from-cart">Delete</button>
        </li>
      `).join('')}
    `;
  };

  return {
    renderInventory,
    renderCart
  };
})();

const Controller = ((model, view) => {
  const { state, fetchInventory, fetchCart, addToCart, updateCartItem, deleteCartItem, checkoutCart } = model;

  const init = () => {
    fetchInventory().then(data => {
      state.inventory = data;
    });

    fetchCart().then(data => {
      state.cart = data;
    });

    state.subscribe(() => {
      view.renderInventory(state.inventory);
      view.renderCart(state.cart);
      attachEventListeners();
    });
  };

  const attachEventListeners = () => {
    document.querySelectorAll('.increase').forEach(button =>
      button.addEventListener('click', handleIncrease)
    );
    document.querySelectorAll('.decrease').forEach(button =>
      button.addEventListener('click', handleDecrease)
    );
    document.querySelectorAll('.add-to-cart').forEach(button =>
      button.addEventListener('click', handleAddToCart)
    );
    document.querySelectorAll('.delete-from-cart').forEach(button =>
      button.addEventListener('click', handleDelete)
    );
    document.querySelector('.checkout-button').addEventListener('click', handleCheckout);
  };

  const handleIncrease = (e) => {
    const itemElement = e.target.closest('.item');
    const id = itemElement.dataset.id;
    const item = state.inventory.find(item => item.id == id);
    if (item) {
      item.selectedQuantity = (item.selectedQuantity || 0) + 1;
      state.inventory = [...state.inventory];
    }
  };

  const handleDecrease = (e) => {
    const itemElement = e.target.closest('.item');
    const id = itemElement.dataset.id;
    const item = state.inventory.find(item => item.id == id);
    if (item && item.selectedQuantity > 0) {
      item.selectedQuantity -= 1;
      state.inventory = [...state.inventory];
    }
  };

  const handleAddToCart = (e) => {
    const itemElement = e.target.closest('.item');
    const id = itemElement.dataset.id;
    const inventoryItem = state.inventory.find(item => item.id == id);

    if (inventoryItem && inventoryItem.selectedQuantity > 0) {
      const cartItem = state.cart.find(item => item.id == id);

      if (cartItem) {
        updateCartItem(id, cartItem.quantity + inventoryItem.selectedQuantity).then(() => {
          cartItem.quantity += inventoryItem.selectedQuantity;
          inventoryItem.selectedQuantity = 0;
          state.inventory = [...state.inventory];
          state.cart = [...state.cart];
        });
      } else {
        addToCart({ id, name: inventoryItem.name, quantity: inventoryItem.selectedQuantity }).then(newCartItem => {
          inventoryItem.selectedQuantity = 0;
          state.inventory = [...state.inventory];
          state.cart = [...state.cart, newCartItem];
        });
      }
    }
  };

  const handleDelete = (e) => {
    const itemElement = e.target.closest('li');
    const id = itemElement.dataset.id;
    deleteCartItem(id).then(() => {
      state.cart = state.cart.filter(item => item.id != id);
    });
  };

  const handleCheckout = () => {
    checkoutCart().then(() => {
      state.cart = [];
      fetchInventory().then(data => {
        state.inventory = data;
      });
    });
  };

  return {
    init
  };
})(Model, View);

Controller.init();
