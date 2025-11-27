import React, { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext();

const initialState = {
  items: [], // { product, quantity }
  shipping_cost: 0,
  selected_shipping_rate: null,
};


function cartReducer(state, action) {
  switch (action.type) {
  // ...existing code...
      case "ADD_TO_CART": {
        const existing = state.items.find(i => i.product.id === action.product.id);
        const available = Number(action.product.inventory ?? action.product.quantity ?? 0);
        const addQty = action.quantity || 1;
        if (existing) {
          const newQty = existing.quantity + addQty;
          return {
            ...state,
            items: state.items.map(i =>
              i.product.id === action.product.id
                ? { ...i, quantity: newQty > available ? available : newQty }
                : i
            ),
          };
        }
        return {
          ...state,
          items: [...state.items, { product: action.product, quantity: addQty > available ? available : addQty }],
        };
      }
    case "SUBTRACT_FROM_CART": {
      const existing = state.items.find(i => i.product.id === action.product.id);
      if (existing && existing.quantity > 1) {
        return {
          ...state,
          items: state.items.map(i =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity - 1 }
              : i
          ),
        };
      } else {
        // Remove item if quantity would go to 0
        return {
          ...state,
          items: state.items.filter(i => i.product.id !== action.product.id),
        };
      }
    }
    case "REMOVE_FROM_CART":
      return {
        ...state,
        items: state.items.filter(i => i.product.id !== action.id),
      };
    case "SET_SHIPPING_COST":
      return {
        ...state,
        shipping_cost: action.cost || 0,
        selected_shipping_rate: action.rate || null,
      };
    case "CLEAR_CART":
      return initialState;
    default:
      return state;
  }
}

const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(
    cartReducer,
    undefined,
    () => {
      try {
        const stored = localStorage.getItem('cart');
        return stored ? JSON.parse(stored) : initialState;
      } catch {
        return initialState;
      }
    }
  );

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  return (
    <CartContext.Provider value={{ cart: state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  return useContext(CartContext);
}

// Helper to get quantity of a product in cart
export function getProductQuantity(cart, productId) {
  const item = cart.items.find(i => i.product.id === productId);
  return item ? item.quantity : 0;
}

export { CartProvider, CartContext };
