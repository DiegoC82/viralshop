// frontend/src/data/categories.ts

export const CATEGORIES_DATA = [
  { id: 'all', name: 'Todos', subcategories: [] },
  { 
    id: 'tech', name: 'Tecnología', icon: 'hardware-chip-outline',
    subcategories: [
      { id: 'tech_all', name: 'Todo Tecnología', icon: 'hardware-chip-outline' },
      { id: 'phones', name: 'Celulares', icon: 'phone-portrait-outline' },
      { id: 'pc', name: 'Computación', icon: 'laptop-outline' },
      { id: 'audio', name: 'Audio y Video', icon: 'headset-outline' },
      { id: 'gaming', name: 'Videojuegos', icon: 'game-controller-outline' },
      { id: 'smartwatch', name: 'Smartwatches', icon: 'watch-outline' },
    ] 
  },
  { 
    id: 'fashion', name: 'Moda', icon: 'shirt-outline',
    subcategories: [
      { id: 'fashion_all', name: 'Todo Moda', icon: 'pricetag-outline' },
      { id: 'clothes', name: 'Ropa', icon: 'shirt-outline' },
      { id: 'shoes', name: 'Calzado', icon: 'walk-outline' },
      { id: 'accessories', name: 'Accesorios', icon: 'glasses-outline' },
      { id: 'jewelry', name: 'Joyas y Relojes', icon: 'diamond-outline' },
    ] 
  },
  { 
    id: 'home', name: 'Hogar y Muebles', icon: 'home-outline',
    subcategories: [
      { id: 'home_all', name: 'Todo Hogar', icon: 'home-outline' },
      { id: 'furniture', name: 'Muebles', icon: 'bed-outline' },
      { id: 'appliances', name: 'Electrodomésticos', icon: 'tv-outline' },
      { id: 'deco', name: 'Decoración', icon: 'color-palette-outline' },
      { id: 'garden', name: 'Jardín y Aire Libre', icon: 'leaf-outline' },
    ] 
  },
  { 
    id: 'services', name: 'Servicios', icon: 'briefcase-outline',
    subcategories: [
      { id: 'services_all', name: 'Todo Servicios', icon: 'briefcase-outline' },
      { id: 'home_repairs', name: 'Reparaciones del Hogar', icon: 'construct-outline' },
      { id: 'tech_support', name: 'Soporte Técnico', icon: 'desktop-outline' },
      { id: 'classes', name: 'Cursos y Clases', icon: 'school-outline' },
      { id: 'events', name: 'Eventos y Fiestas', icon: 'musical-notes-outline' },
      { id: 'health_beauty', name: 'Salud y Belleza', icon: 'medkit-outline' },
    ] 
  },
  { 
    id: 'food_and_drinks', name: 'Comida y Bebidas', icon: 'restaurant-outline',
    subcategories: [
      { id: 'food_all', name: 'Todo Comida y Bebidas', icon: 'cart-outline' },
      { id: 'food', name: 'Alimentos', icon: 'restaurant-outline' },
      { id: 'drinks', name: 'Bebidas', icon: 'wine-outline' },
      { id: 'snacks', name: 'Snacks y Postres', icon: 'ice-cream-outline' },
    ] 
  },
  { 
    id: 'sports', name: 'Deportes', icon: 'football-outline',
    subcategories: [
      { id: 'sports_all', name: 'Todo Deportes', icon: 'football-outline' },
      { id: 'fitness', name: 'Fitness y Gym', icon: 'barbell-outline' },
      { id: 'cycling', name: 'Ciclismo', icon: 'bicycle-outline' },
      { id: 'camping', name: 'Camping', icon: 'bonfire-outline' },
    ] 
  },
  { 
    id: 'beauty', name: 'Belleza y Salud', icon: 'sparkles-outline',
    subcategories: [
      { id: 'beauty_all', name: 'Todo Belleza', icon: 'sparkles-outline' },
      { id: 'makeup', name: 'Maquillaje', icon: 'color-wand-outline' },
      { id: 'skincare', name: 'Cuidado Facial', icon: 'water-outline' },
      { id: 'perfumes', name: 'Perfumes', icon: 'flask-outline' },
      { id: 'hair', name: 'Cuidado del Cabello', icon: 'cut-outline' },
    ] 
  },
  { 
    id: 'vehicles', name: 'Vehículos', icon: 'car-outline',
    subcategories: [
      { id: 'vehicles_all', name: 'Todo Vehículos', icon: 'car-outline' },
      { id: 'auto_parts', name: 'Accesorios Autos', icon: 'build-outline' },
      { id: 'moto_parts', name: 'Accesorios Motos', icon: 'speedometer-outline' },
      { id: 'audio_car', name: 'Audio para Vehículos', icon: 'radio-outline' },
    ] 
  },
  { 
    id: 'tools', name: 'Herramientas', icon: 'hammer-outline',
    subcategories: [
      { id: 'tools_all', name: 'Todo Herramientas', icon: 'hammer-outline' },
      { id: 'electric', name: 'Eléctricas', icon: 'flash-outline' },
      { id: 'manual', name: 'Manuales', icon: 'construct-outline' },
    ] 
  }
];

// 👇 Exportamos una lista simple solo con los nombres para la pantalla de Intereses
export const SIMPLE_CATEGORIES = CATEGORIES_DATA
  .filter(cat => cat.id !== 'all')
  .map(cat => cat.name);