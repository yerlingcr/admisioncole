# Imágenes para Preguntas del Quiz

Este directorio contiene las imágenes que se muestran en las preguntas del quiz de admisión.

## Estructura recomendada:

- `pregunta1.jpg` - Imagen para la pregunta 1
- `pregunta2.jpg` - Imagen para la pregunta 2
- `pregunta3.jpg` - Imagen para la pregunta 3
- etc.

## Especificaciones técnicas:

- **Formato**: JPG, PNG o WebP
- **Tamaño recomendado**: Máximo 800x600 píxeles
- **Peso máximo**: 500KB por imagen
- **Optimización**: Comprimir las imágenes para web

## Notas:

- Si una pregunta no tiene imagen, se puede dejar como `null` en el código
- Las imágenes se muestran con click para ampliar
- Se recomienda usar imágenes relacionadas con el contenido educativo

## Ejemplo de uso en el código:

```javascript
{
  id: 1,
  question: "¿Cuál es la capital de Costa Rica?",
  image: "/img/questions/pregunta1.jpg", // Con imagen
  options: [...]
},
{
  id: 2,
  question: "¿En qué año se independizó Costa Rica?",
  image: null, // Sin imagen
  options: [...]
}
```
