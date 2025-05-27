// Obtener elementos 
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const translateBtn = document.getElementById('translateBtn');
const swapBtn = document.getElementById('swapBtn');
const clearBtn = document.getElementById('clearBtn');
const startCameraBtn = document.getElementById('startCameraBtn');
const requestPermissionBtn = document.getElementById('requestPermissionBtn');
const letraDetectada = document.getElementById('letraDetectada');
const palabraDetectada = document.getElementById('palabraDetectada');
const createLetterBtn = document.getElementById('createLetterBtn');
const clearWordBtn = document.getElementById('clearWordBtn');
const cameraContainer = document.querySelector('.camara');
const imageContainer = document.getElementById('imageContainer');

// Variables para la formación de palabras
let palabraActual = '';
let ultimaLetraDetectada = '';
let detectionInterval = null;

// Conjunto de vocales para verificación
const vocales = new Set(['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U']);

// Variable para controlar el tiempo de espera en la traducción en tiempo real
let typingTimer;
const doneTypingInterval = 500; // tiempo en milisegundos (medio segundo)

// Crear elemento de audio para reproducción
const audioElement = new Audio();

// Función para validar que solo se ingresen letras sin acentos
function validarTexto(texto) {
    // Expresión regular que solo permite letras de A-Z y a-z (sin acentos, sin números, sin caracteres especiales)
    return texto.replace(/[^a-zA-ZñÑ]/g, '');
}

// Función para verificar si una palabra es válida en español
function esPalabraValida(palabra) {
    // Esta es una implementación básica
    // En una implementación real, se podría usar un diccionario o API
    
    // Reglas básicas para palabras en español:
    // 1. Debe tener al menos 2 letras
    // 2. No debe tener más de 3 consonantes consecutivas
    // 3. Debe tener al menos una vocal (excepto palabras muy cortas como "y")
    
    if (palabra.length < 2) return false;
    
    // Verificar si tiene al menos una vocal (excepto palabras muy cortas)
    if (palabra.length > 2) {
        let tieneVocal = false;
        for (let i = 0; i < palabra.length; i++) {
            if (vocales.has(palabra[i].toLowerCase())) {
                tieneVocal = true;
                break;
            }
        }
        if (!tieneVocal) return false;
    }
    
    // Verificar que no tenga más de 3 consonantes consecutivas
    let consonantesConsecutivas = 0;
    for (let i = 0; i < palabra.length; i++) {
        if (!vocales.has(palabra[i].toLowerCase())) {
            consonantesConsecutivas++;
            if (consonantesConsecutivas > 3) return false;
        } else {
            consonantesConsecutivas = 0;
        }
    }
    
    return true;
}

// Función para leer una palabra en voz alta usando audio directo
function leerPalabra(palabra) {
    if (!palabra || palabra.trim() === '') {
        mostrarMensaje("No hay palabra para leer");
        return;
    }
    
    // Detener cualquier reproducción en curso
    audioElement.pause();
    audioElement.currentTime = 0;
    
    // Usar la API de audio de Google Translate (no requiere clave API)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(palabra)}&tl=es&client=tw-ob`;
    
    audioElement.src = url;
    
    // Reproducir el audio
    const playPromise = audioElement.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log("Reproduciendo audio...");
            mostrarMensaje(`Reproduciendo: ${palabra}`, 2000);
        }).catch(error => {
            console.error("Error al reproducir audio:", error);
            mostrarMensaje("Error al reproducir. Intente de nuevo.", 2000);
        });
    }
}

// Función para agregar letra a la palabra actual
function agregarLetraAPalabra(letra) {
    if (!letra || letra.trim() === '') return false;
    
    // Convertir a minúscula para comparaciones
    const letraMinuscula = letra.toLowerCase();
    
    // Verificar si es la misma letra que la última detectada para evitar repeticiones
    if (letraMinuscula === ultimaLetraDetectada.toLowerCase()) {
        mostrarMensaje("No se permiten letras repetidas consecutivas");
        return false;
    }
    
    // Verificar si es una vocal y la última letra también era vocal
    const esVocal = vocales.has(letraMinuscula);
    const ultimaEsVocal = vocales.has(ultimaLetraDetectada.toLowerCase());
    
    if (esVocal && ultimaEsVocal) {
        mostrarMensaje("No se permiten vocales consecutivas");
        return false;
    }
    
    // Regla adicional: No más de 3 consonantes consecutivas
    if (!esVocal) {
        let consonantesConsecutivas = 1; // La actual
        let posicion = palabraActual.length - 1;
        
        while (posicion >= 0 && !vocales.has(palabraActual[posicion].toLowerCase())) {
            consonantesConsecutivas++;
            posicion--;
        }
        
        if (consonantesConsecutivas > 3) {
            mostrarMensaje("No se permiten más de 3 consonantes consecutivas");
            return false;
        }
    }
    
    // Agregar la letra a la palabra actual
    palabraActual += letra;
    ultimaLetraDetectada = letra;
    
    // Actualizar la visualización de la palabra
    actualizarPalabraFormada();
    
    console.log(`Palabra actual: ${palabraActual}`);
    
    // Verificar si la palabra es válida
    if (esPalabraValida(palabraActual)) {
        mostrarMensaje("¡Palabra válida formada!");
        
        // Leer la palabra en voz alta
        setTimeout(() => {
            leerPalabra(palabraActual);
        }, 500);
        
        // Agregar la palabra al área de texto de salida
        if (outputText) {
            if (outputText.value) {
                outputText.value += ' ' + palabraActual;
            } else {
                outputText.value = palabraActual;
            }
        }
    }
    
    return true;
}

// Función para mostrar mensaje temporal
function mostrarMensaje(mensaje, duracion = 2000) {
    // Crear o actualizar elemento de mensaje
    let mensajeElement = document.getElementById('mensajeTemp');
    if (!mensajeElement) {
        mensajeElement = document.createElement('div');
        mensajeElement.id = 'mensajeTemp';
        mensajeElement.style.position = 'fixed';
        mensajeElement.style.bottom = '20px';
        mensajeElement.style.left = '50%';
        mensajeElement.style.transform = 'translateX(-50%)';
        mensajeElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        mensajeElement.style.color = 'white';
        mensajeElement.style.padding = '10px 20px';
        mensajeElement.style.borderRadius = '5px';
        mensajeElement.style.zIndex = '1000';
        document.body.appendChild(mensajeElement);
    }
    
    mensajeElement.textContent = mensaje;
    mensajeElement.style.display = 'block';
    
    // Ocultar después de la duración especificada
    setTimeout(() => {
        mensajeElement.style.display = 'none';
    }, duracion);
}

// Función para actualizar la visualización de la palabra formada
function actualizarPalabraFormada() {
    if (palabraDetectada) {
        palabraDetectada.textContent = palabraActual;
    }
}

// Función para limpiar la palabra actual
function limpiarPalabra() {
    palabraActual = '';
    ultimaLetraDetectada = '';
    actualizarPalabraFormada();
    mostrarMensaje("Palabra limpiada");
}

// Función para solicitar permisos de cámara
async function requestCameraPermissions() {
    try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        alert('Permisos de cámara concedidos. Ahora puede activar la cámara.');
    } catch (error) {
        console.error('Error al solicitar permisos de cámara:', error);
        alert('No se pudo acceder a la cámara. Asegúrate de haber otorgado los permisos necesarios.');
    }
}

// Función para activar la cámara
async function getCameraPermissions() {
    try {
        // Limpiar cualquier intervalo existente
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoElement = document.createElement('video');
        videoElement.id = 'video';
        videoElement.width = 640;
        videoElement.height = 480;
        videoElement.autoplay = true;
        videoElement.srcObject = stream;
        cameraContainer.innerHTML = '';  // Limpiar contenido previo
        cameraContainer.appendChild(videoElement);

        startCameraBtn.style.display = 'none'; // Oculta el botón de activar cámara tras el éxito
        
        // Iniciar la detección de letras
        detectLetters(videoElement);
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Asegúrate de haber otorgado los permisos necesarios.');
    }
}

// Función para traducir texto a lenguaje de señas
async function translateToSignLanguage(text) {
    try {
        // Validar el texto antes de enviarlo
        const textoValidado = validarTexto(text);
        
        const response = await fetch('/traducir', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ texto: textoValidado })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.traduccion;
        } else {
            throw new Error('Error en la solicitud de traducción');
        }
    } catch (error) {
        console.error('Error:', error);
        return 'Error al traducir';
    }
}

async function handleTranslation() {
    const input = inputText.value.trim();
    
    if (input) {
        imageContainer.innerHTML = ''; 
        const imagePaths = await translateToSignLanguage(input);
        
        if (imagePaths && imagePaths.length > 0) {
            // Crear un contenedor para el carrusel
            const carouselContainer = document.createElement('div');
            carouselContainer.className = 'carousel-container';
            carouselContainer.style.display = 'flex';
            carouselContainer.style.flexWrap = 'nowrap';
            carouselContainer.style.overflowX = 'auto';
            carouselContainer.style.scrollBehavior = 'smooth';
            carouselContainer.style.padding = '10px 0';
            carouselContainer.style.width = '100%';
            
            // Duplicar las imágenes para crear un efecto cíclico
            const allImages = [...imagePaths, ...imagePaths];
            
            allImages.forEach(path => {
                const imgContainer = document.createElement('div');
                imgContainer.style.flexShrink = '0';
                imgContainer.style.marginRight = '10px';
                
                const img = document.createElement('img');
                img.src = path;
                img.alt = 'Traducción de ' + path;
                img.style.width = '100px';  
                img.style.height = '100px';
                img.style.objectFit = 'contain';
                
                imgContainer.appendChild(img);
                carouselContainer.appendChild(imgContainer);
            });
            
            imageContainer.appendChild(carouselContainer);
        } else {
            imageContainer.innerHTML = '<p>No se encontraron imágenes para traducir</p>';
        }
    }
}

// Nueva función para manejar traducción en tiempo real
function handleRealTimeTranslation() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(handleTranslation, doneTypingInterval);
}

function clearTextAreas() {
    if (inputText) inputText.value = '';
    if (outputText) outputText.value = '';
    if (imageContainer) imageContainer.innerHTML = ''; 
    palabraActual = '';
    ultimaLetraDetectada = '';
    actualizarPalabraFormada();
}

function redirectToCameraPage() {
    window.location.href = 'camara.html'; 
}

// Función para manejar el clic en el botón "Crear Letra"
function handleCrearLetra() {
    // Obtener la letra detectada actualmente
    const letra = letraDetectada ? letraDetectada.textContent : '';
    
    if (letra && letra.trim() !== '' && letra !== 'N/A') {
        agregarLetraAPalabra(letra);
    } else {
        mostrarMensaje("No se detecta ninguna letra válida");
    }
}

// Configuración de eventos
if (translateBtn) {
    translateBtn.addEventListener('click', handleTranslation);
}

if (clearBtn) {
    clearBtn.addEventListener('click', clearTextAreas);
}

if (startCameraBtn) {
    startCameraBtn.addEventListener('click', getCameraPermissions);
}

if (swapBtn) {
    swapBtn.addEventListener('click', redirectToCameraPage);
}

if (requestPermissionBtn) {
    requestPermissionBtn.addEventListener('click', requestCameraPermissions);
}

if (createLetterBtn) {
    createLetterBtn.addEventListener('click', handleCrearLetra);
}

if (clearWordBtn) {
    clearWordBtn.addEventListener('click', limpiarPalabra);
}

// Eventos para validación y traducción en tiempo real
if (inputText) {
    // Validar entrada en tiempo real
    inputText.addEventListener('input', function(e) {
        // Guardar la posición del cursor
        const cursorPos = this.selectionStart;
        // Validar y actualizar el texto
        const textoOriginal = this.value;
        const textoValidado = validarTexto(textoOriginal);
        
        // Solo actualizar si hay cambios para evitar problemas con el cursor
        if (textoOriginal !== textoValidado) {
            this.value = textoValidado;
            // Ajustar la posición del cursor si se eliminaron caracteres antes de la posición actual
            const posDiff = textoOriginal.length - textoValidado.length;
            this.setSelectionRange(cursorPos - posDiff, cursorPos - posDiff);
        }
    });
    
    // Eventos para traducción
    inputText.addEventListener('keyup', handleRealTimeTranslation);
    inputText.addEventListener('paste', function(e) {
        // Prevenir el comportamiento predeterminado de pegado
        e.preventDefault();
        
        // Obtener el texto del portapapeles
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        
        // Validar el texto pegado
        const textoValidado = validarTexto(pastedText);
        
        // Insertar el texto validado en la posición del cursor
        const cursorPos = this.selectionStart;
        const textoBefore = this.value.substring(0, cursorPos);
        const textoAfter = this.value.substring(this.selectionEnd);
        
        this.value = textoBefore + textoValidado + textoAfter;
        
        // Actualizar la posición del cursor
        const newCursorPos = cursorPos + textoValidado.length;
        this.setSelectionRange(newCursorPos, newCursorPos);
        
        // Activar la traducción en tiempo real
        handleRealTimeTranslation();
    });
}

function detectLetters(videoElement) {
    // Establecer el intervalo para la detección de letras
    detectionInterval = setInterval(async () => {
        const response = await getFingerPositions(videoElement); 
        const letra = response.letra; 

        if (letraDetectada) {
            letraDetectada.textContent = letra;
        }
    }, 1000); 
}

// Función para obtener posiciones de dedos y letra desde el servidor
async function getFingerPositions(videoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/png');
    
    try {
        const response = await fetch('/detect_fingers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageData })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("Letra recibida del servidor:", data.letra); 
            return data; 
        } else {
            throw new Error('Error en la solicitud de detección de dedos');
        }
    } catch (error) {
        console.error('Error:', error);
        return { letra: 'N/A' }; 
    }
}

// Iniciar la traducción al cargar la página si hay texto previamente ingresado
window.addEventListener('DOMContentLoaded', () => {
    if (inputText && inputText.value.trim() !== '') {
        // Validar el texto existente al cargar la página
        inputText.value = validarTexto(inputText.value);
        handleTranslation();
    }
    
    // Inicializar audio con un clic del usuario para desbloquear reproducción
    document.addEventListener('click', function audioUnlock() {
        // Crear un sonido silencioso
        const silentSound = new Audio("data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
        silentSound.play().then(() => {
            document.removeEventListener('click', audioUnlock);
            console.log("Audio desbloqueado");
        }).catch(e => {
            console.log("Error al desbloquear audio:", e);
        });
    });
});
