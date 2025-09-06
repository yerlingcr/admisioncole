// Servicio con datos geográficos de Costa Rica
// Provincias, cantones y distritos

const geografiaCostaRica = {
  "San José": {
    "San José": ["Carmen", "Merced", "Hospital", "Catedral", "Zapote", "San Francisco de Dos Ríos", "Uruca", "Mata Redonda", "Pavas", "Hatillo", "San Sebastián"],
    "Escazú": ["Escazú", "San Antonio", "San Rafael"],
    "Desamparados": ["Desamparados", "San Miguel", "San Juan de Dios", "San Rafael Arriba", "San Antonio", "Frailes", "Patarrá", "San Cristóbal Norte", "San Cristóbal Sur", "San Gabriel", "San Juan Bosco", "San Lorenzo", "Damas", "San Rafael Abajo", "Los Guido"],
    "Puriscal": ["Santiago", "Mercedes Sur", "Barbacoas", "Grifo Alto", "San Rafael", "Candelarita", "Desamparaditos", "San Antonio Grifo", "Chires", "La Cangreja"],
    "Tarrazú": ["San Marcos", "San Lorenzo", "San Carlos"],
    "Aserrí": ["Aserrí", "Tarbaca", "Vuelta de Jorco", "San Gabriel", "La Legua", "Monterrey", "Salitrillos"],
    "Mora": ["Colón", "Guayabo", "Tabarcia", "Piedras Negras", "Picagres", "Jaris"],
    "Goicoechea": ["Guadalupe", "San Francisco", "Calle Blancos", "Mata de Plátano", "Ipís", "Rancho Redondo", "Purral"],
    "Santa Ana": ["Santa Ana", "Salitral", "Pozos", "Uruca", "Piedades", "Brasil"],
    "Alajuelita": ["Alajuelita", "San Josecito", "San Antonio", "Concepción", "San Felipe"],
    "Vázquez de Coronado": ["San Isidro", "San Rafael", "Dulce Nombre de Jesús", "Patalillo", "Cascajal"],
    "Acosta": ["San Ignacio", "Guaitil", "Palmichal", "Cangrejal", "Sabanillas"],
    "Tibás": ["San Juan", "Cinco Esquinas", "Anselmo Llorente", "León XIII", "Colima"],
    "Moravia": ["San Vicente", "San Jerónimo", "La Trinidad"],
    "Montes de Oca": ["San Pedro", "Sabanilla", "Mercedes", "San Rafael"],
    "Turrubares": ["San Pablo", "San Pedro", "San Juan de Mata", "San Luis", "Carara"],
    "Dota": ["Santa María", "Jardín", "Copey"],
    "Curridabat": ["Curridabat", "Granadilla", "Sánchez", "Tirrases"],
    "Pérez Zeledón": ["San Isidro de El General", "El General", "Daniel Flores", "Rivas", "San Pedro", "Platanares", "Pejibaye", "Cajón", "Barú", "Río Nuevo", "Páramo", "La Amistad"],
    "León Cortés Castro": ["San Pablo", "San Andrés", "Llano Bonito", "San Isidro", "Santa Cruz", "San Antonio"]
  },
  "Alajuela": {
    "Alajuela": ["Alajuela", "San José", "Carrizal", "San Antonio", "Guácima", "San Isidro", "Sabanilla", "San Rafael", "Río Segundo", "Desamparados", "Turrúcares", "Tambor", "La Garita", "Sarapiquí"],
    "San Ramón": ["San Ramón", "Santiago", "San Juan", "Piedades Norte", "Piedades Sur", "San Rafael", "San Isidro", "Ángeles", "Alfaro", "Volio", "Concepción", "Zapotal", "Peñas Blancas"],
    "Grecia": ["Grecia", "San Isidro", "San José", "San Roque", "Tacares", "Puente de Piedra", "Bolívar"],
    "San Mateo": ["San Mateo", "Desmonte", "Jesús María", "Labrador"],
    "Atenas": ["Atenas", "Jesús", "Mercedes", "San Isidro", "Concepción", "San José", "Santa Eulalia", "Escobal"],
    "Naranjo": ["Naranjo", "San Miguel", "San José", "Cirrí Sur", "San Jerónimo", "San Juan Chico"],
    "Palmares": ["Palmares", "Zaragoza", "Buenos Aires", "Santiago", "Candelaria", "Esquipulas", "La Granja"],
    "Poás": ["San Pedro", "San Juan", "San Rafael", "Carrillos", "Sabana Redonda"],
    "Orotina": ["Orotina", "Mastate", "Hacienda Vieja", "Coyolar", "La Ceiba"],
    "San Carlos": ["Quesada", "Florencia", "Buenavista", "Aguas Zarcas", "Venecia", "Pital", "La Fortuna", "La Tigra", "La Palmera", "Venecia", "Cutris", "Monterrey", "Pocosol"],
    "Zarcero": ["Zarcero", "Laguna", "Tapezco", "Guadalupe", "Palmira", "Zapote", "Brisas"],
    "Valverde Vega": ["Sabanilla", "San Juan", "San Rafael", "San Pedro", "San Lorenzo"],
    "Upala": ["Upala", "Aguas Claras", "San José", "Bijagua", "Delicias", "Dos Ríos", "Yolillal", "Canalete"],
    "Los Chiles": ["Los Chiles", "Caño Negro", "El Amparo", "San Jorge"],
    "Guatuso": ["San Rafael", "Buenavista", "Cote", "Katira"],
    "Río Cuarto": ["Río Cuarto", "Santa Rita", "Santa Isabel"]
  },
  "Cartago": {
    "Cartago": ["Oriental", "Occidental", "Carmen", "San Nicolás", "Aguacaliente", "Guadalupe", "Corralillo", "Tierra Blanca", "Dulce Nombre", "Llano Grande", "Quebradilla"],
    "Paraíso": ["Paraíso", "Santiago", "Orosi", "Cachí", "Llanos de Santa Lucía"],
    "La Unión": ["Tres Ríos", "San Diego", "San Juan", "San Rafael", "Concepción", "Dulce Nombre", "San Ramón", "Río Azul"],
    "Jiménez": ["Juan Viñas", "Tucurrique", "Pejibaye"],
    "Turrialba": ["Turrialba", "La Suiza", "Peralta", "San Carlos", "Santa Cruz", "Santa Teresita", "Pavones", "Tuis", "Tayutic", "Santa Rosa", "Tres Equis", "La Isabel", "Chirripó"],
    "Alvarado": ["Pacayas", "Cervantes", "Capellades"],
    "Oreamuno": ["San Rafael", "Cot", "Potrero Cerrado", "Cipreses", "Santa Rosa"],
    "El Guarco": ["El Tejar", "San Isidro", "Tobosi", "Patio de Agua"]
  },
  "Heredia": {
    "Heredia": ["Heredia", "Mercedes", "San Francisco", "Ulloa", "Varablanca"],
    "Barva": ["Barva", "San Pedro", "San Pablo", "San Roque", "Santa Lucía", "San José de la Montaña"],
    "Santo Domingo": ["Santo Domingo", "San Vicente", "San Miguel", "Paracito", "Santo Tomás", "Santa Rosa", "Tures", "Pará"],
    "Santa Bárbara": ["Santa Bárbara", "San Pedro", "San Juan", "Jesús", "Santo Domingo", "Purabá"],
    "San Rafael": ["San Rafael", "San Josecito", "Santiago", "Los Ángeles", "Concepción"],
    "San Isidro": ["San Isidro", "San José", "Concepción", "San Francisco"],
    "Belén": ["San Antonio", "La Ribera", "La Asunción"],
    "Flores": ["San Joaquín", "Barrantes", "Llorente"],
    "San Pablo": ["San Pablo", "Rincón de Sabanilla"],
    "Sarapiquí": ["Puerto Viejo", "La Virgen", "Horquetas", "Llanuras del Gaspar", "Cureña"]
  },
  "Guanacaste": {
    "Liberia": ["Liberia", "Cañas Dulces", "Mayorga", "Nacascolo", "Curubandé"],
    "Nicoya": ["Nicoya", "Mansión", "San Antonio", "Quebrada Honda", "Sámara", "Nosara", "Belén de Nosarita"],
    "Santa Cruz": ["Santa Cruz", "Bolson", "Veintisiete de Abril", "Tempate", "Cartagena", "Cuajiniquil", "Diriá", "Cabo Velas", "Tamarindo"],
    "Bagaces": ["Bagaces", "Fortuna", "Mogote", "Río Naranjo"],
    "Carrillo": ["Filadelfia", "Palmira", "Sardinal", "Belén"],
    "Cañas": ["Cañas", "Palmira", "San Miguel", "Bebedero", "Porozal"],
    "Abangares": ["Las Juntas", "Sierra", "San Juan", "Colorado"],
    "Tilarán": ["Tilarán", "Quebrada Grande", "Tronadora", "Santa Rosa", "Líbano", "San José", "Cabeceras", "Arenal"],
    "Nandayure": ["Carmona", "Santa Rita", "Zapotal", "San Pablo", "Porvenir", "Bejuco"],
    "La Cruz": ["La Cruz", "Santa Cecilia", "Garita", "Santa Elena"],
    "Hojancha": ["Hojancha", "Monte Romo", "Puerto Carrillo", "Huacas"]
  },
  "Puntarenas": {
    "Puntarenas": ["Puntarenas", "Pitahaya", "Chomes", "Lepanto", "Paquera", "Manzanillo", "Guacimal", "Barranca", "Monte Verde", "Isla del Coco", "Cobano", "Chacarita", "Chira", "Acapulco", "El Roble", "Arancibia"],
    "Esparza": ["Espíritu Santo", "San Juan Grande", "Macacona", "San Rafael", "San Jerónimo"],
    "Buenos Aires": ["Buenos Aires", "Volcán", "Potrero Grande", "Boruca", "Pilas", "Colinas", "Chánguena", "Biolley", "Brunka"],
    "Montes de Oro": ["Miramar", "La Unión", "San Isidro"],
    "Osa": ["Puerto Cortés", "Palmar", "Sierpe", "Bahía Ballena", "Piedras Blancas", "Bahía Drake"],
    "Quepos": ["Quepos", "Savegre", "Naranjito"],
    "Golfito": ["Golfito", "Puerto Jiménez", "Guaycará", "Pavón"],
    "Coto Brus": ["San Vito", "Sabalito", "Aguabuena", "Limoncito", "Pittier", "Gutiérrez Braun"],
    "Parrita": ["Parrita"],
    "Corredores": ["Corredor", "La Cuesta", "Canoas", "Laurel"],
    "Garabito": ["Jacó", "Tárcoles"]
  },
  "Limón": {
    "Limón": ["Limón", "Valle La Estrella", "Río Blanco", "Matama"],
    "Pococí": ["Guápiles", "Jiménez", "Rita", "Roxana", "Cariari", "Colorado", "La Colonia"],
    "Siquirres": ["Siquirres", "Pacuarito", "Florida", "Germania", "El Cairo", "Reventazón", "Río Blanco"],
    "Talamanca": ["Bratsi", "Sixaola", "Cahuita", "Telire"],
    "Matina": ["Matina", "Batán", "Carrandi"],
    "Guácimo": ["Guácimo", "Mercedes", "Pocora", "Río Jiménez", "Duacarí"]
  }
}

class GeografiaService {
  // Obtener todas las provincias
  getProvincias() {
    return Object.keys(geografiaCostaRica)
  }

  // Obtener cantones de una provincia
  getCantones(provincia) {
    if (!provincia || !geografiaCostaRica[provincia]) {
      return []
    }
    return Object.keys(geografiaCostaRica[provincia])
  }

  // Obtener distritos de un cantón en una provincia
  getDistritos(provincia, canton) {
    if (!provincia || !canton || !geografiaCostaRica[provincia] || !geografiaCostaRica[provincia][canton]) {
      return []
    }
    return geografiaCostaRica[provincia][canton]
  }

  // Obtener información completa de ubicación
  getUbicacionCompleta(provincia, canton, distrito) {
    return {
      provincia: provincia || '',
      canton: canton || '',
      distrito: distrito || '',
      esValida: this.validarUbicacion(provincia, canton, distrito)
    }
  }

  // Validar si una ubicación es válida
  validarUbicacion(provincia, canton, distrito) {
    if (!provincia || !canton || !distrito) return false
    
    const cantones = this.getCantones(provincia)
    const distritos = this.getDistritos(provincia, canton)
    
    return cantones.includes(canton) && distritos.includes(distrito)
  }

  // Obtener estadísticas de ubicaciones
  getEstadisticas() {
    const provincias = this.getProvincias()
    let totalCantones = 0
    let totalDistritos = 0

    provincias.forEach(provincia => {
      const cantones = this.getCantones(provincia)
      totalCantones += cantones.length
      
      cantones.forEach(canton => {
        const distritos = this.getDistritos(provincia, canton)
        totalDistritos += distritos.length
      })
    })

    return {
      totalProvincias: provincias.length,
      totalCantones,
      totalDistritos
    }
  }
}

export default new GeografiaService()

