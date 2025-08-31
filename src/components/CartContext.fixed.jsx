import React, { createContext, useReducer, useEffect } from 'react';

// Create the context
const CartContext = createContext();

// Reducer function
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existing = state.cart.find(item => item.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      } else {
        return {
          ...state,
          cart: [...state.cart, { ...action.payload, quantity: 1 }],
        };
      }
    }
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item.id !== action.payload),
      };
    case 'CLEAR_CART':
      return {
        ...state,
        cart: [],
      };
    case 'SET_CART':
      return {
        ...state,
        cart: action.payload,
      };
    default:
      return state;
  }
}

// Initializer for useReducer to load from localStorage
function init(initialState) {
  try {
    const stored = localStorage.getItem('cart');
    if (stored) {
      return { cart: JSON.parse(stored) };
    }
  } catch (e) {}
  return initialState;
}

const initialState = { cart: [] };

// Provider component
const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState, init);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state.cart));
  }, [state.cart]);

  return (
    <CartContext.Provider value={{ cart: state.cart, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export { CartContext, CartProvider };
