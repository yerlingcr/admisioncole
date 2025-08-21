import { useState, useEffect } from 'react'

function useLocalStorage(key, initialValue) {
  // Estado para almacenar nuestro valor
  // Pasa la función inicial al useState para que solo se ejecute una vez
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      // Analiza el JSON almacenado o devuelve initialValue
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      // Si hay un error, devuelve initialValue
      console.error(`Error leyendo localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Función para establecer el valor en localStorage
  const setValue = (value) => {
    try {
      // Permite que el valor sea una función para que tengamos la misma API que useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      // Guarda en el estado
      setStoredValue(valueToStore)
      // Guarda en localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error estableciendo localStorage key "${key}":`, error)
    }
  }

  // Función para limpiar el valor de localStorage
  const removeValue = () => {
    try {
      setStoredValue(initialValue)
      window.localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removiendo localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue, removeValue]
}

export default useLocalStorage
