import React, { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext();

const initialState = {
  items: [], // { product, quantity }
};

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_TO_CART":
      const existing = state.items.find(i => i.product.id === action.product.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity + (action.quantity || 1) }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { product: action.product, quantity: action.quantity || 1 }],
      };
    case "REMOVE_FROM_CART":
      return {
        ...state,
        items: state.items.filter(i => i.product.id !== action.id),
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
export { CartProvider, CartContext };
