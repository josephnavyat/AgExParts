import React, { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext();

const initialState = {
  items: [], // { product, quantity }
  shipping: null, // { cost: number, label: string, rateId: string }
};

function cartReducer(state, action) {
  switch (action.type) {
  // ...existing code...
      case "ADD_TO_CART": {
        // Ensure product.price is a valid positive number before adding to cart
        const rawProduct = action.product || {};
        let price = rawProduct.price;
        if (typeof price === 'string') {
          price = price.trim() === '' ? NaN : Number(price);
        } else {
          price = Number(price);
        }
        if (isNaN(price) || price <= 0) {
          console.error('Attempted to add product with invalid price to cart:', rawProduct.id || rawProduct);
          // Do not modify state if product price is invalid
          return state;
        }

        const product = { ...rawProduct, price };
        const existing = state.items.find(i => i.product.id === product.id);
        const available = Number(product.inventory ?? product.quantity ?? 0);
        const addQty = action.quantity || 1;
        if (existing) {
          const newQty = existing.quantity + addQty;
          return {
            ...state,
            items: state.items.map(i =>
              i.product.id === product.id
                ? { ...i, quantity: newQty > available ? available : newQty }
                : i
            ),
          };
        }
        return {
          ...state,
          items: [...state.items, { product, quantity: addQty > available ? available : addQty }],
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
    case 'SET_SHIPPING':
      return {
        ...state,
        shipping: action.shipping || null,
      };
    case 'SET_SHIPPING_COST':
      // backward compatibility: accept cost and rate
      {
        const shippingObj = action.shipping || (action.cost != null ? { cost: Number(action.cost), label: action.rate ? (action.rate.provider + ' ' + (action.rate.servicelevel?.name || '')) : '', rateId: action.rate?.object_id || null } : state.shipping);
        const shippingCostNumber = shippingObj && shippingObj.cost != null ? Number(shippingObj.cost) : (action.cost != null ? Number(action.cost) : (state.shipping ? Number(state.shipping.cost || 0) : 0));
        return {
          ...state,
          shipping: shippingObj,
          // keep older code paths working by providing a top-level numeric shipping_cost
          shipping_cost: shippingCostNumber,
        };
      }
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
        if (!stored) return initialState;
        const parsed = JSON.parse(stored);
        if (!parsed || !Array.isArray(parsed.items)) return initialState;
        // Sanitize items: coerce price to number and drop invalid-priced items
        const sanitizedItems = [];
        for (const it of parsed.items) {
          const prod = it && it.product ? { ...it.product } : null;
          const qty = it && typeof it.quantity === 'number' ? it.quantity : 1;
          if (!prod) continue;
          let price = prod.price;
          if (typeof price === 'string') price = price.trim() === '' ? NaN : Number(price);
          else price = Number(price);
          if (isNaN(price) || price <= 0) {
            console.warn('Removing invalid-priced product from persisted cart:', prod && (prod.id || prod.name));
            continue; // skip invalid price
          }
          prod.price = price;
          sanitizedItems.push({ product: prod, quantity: qty });
        }
        return { items: sanitizedItems };
      } catch (e) {
        console.error('Failed to parse persisted cart, clearing:', e);
        try { localStorage.removeItem('cart'); } catch {};
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
