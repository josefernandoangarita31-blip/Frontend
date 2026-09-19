
const API_URL = "https://backend-production-076e5.up.railway.app";
let codigoEditando = null;

// --- DIBUJAR FILAS EN LA TABLA Y CALCULAR TOTAL ---
function renderizarFilasTabla(productos) {
    const tabla = document.getElementById("tablaProductos");
    if (!tabla) return;

    tabla.innerHTML = "";

    if (productos.length === 0) {
        tabla.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No se encontraron productos.</td></tr>`;
        calcularTotalInventario([]);
        return;
    }

    productos.forEach(producto => {
        const precio = Number(producto.precio) || 0;
        const cantidad = Number(producto.cantidad) || 0;
        const stockMinimo = Number(producto.stockMinimo) || 0;
        const valorTotal = precio * cantidad;

        const proveedorTexto = (producto.proveedor && producto.proveedor !== "undefined") 
            ? producto.proveedor 
            : "N/A";

        let badgeEstado = "";
        if (cantidad === 0) {
            badgeEstado = `<span class="badge bg-danger">Agotado</span>`;
        } else if (cantidad < stockMinimo) {
            badgeEstado = `<span class="badge bg-warning text-dark">⚠️ Stock bajo</span>`;
        } else {
            badgeEstado = `<span class="badge bg-success">Disponible</span>`;
        }

        const fila = `
            <tr>
                <td><strong>${producto.codigo || ''}</strong></td>
                <td>${producto.nombre || ''}</td>
                <td>${producto.categoria || 'Sin categoría'}</td>
                <td>${proveedorTexto}</td>
                <td>$${precio.toLocaleString('es-CO')}</td>
                <td>${cantidad}</td>
                <td>${badgeEstado}</td>
                <td>$${valorTotal.toLocaleString('es-CO')}</td>
                <td class="text-nowrap">
                    <button class="btn btn-warning btn-sm me-1" onclick="editarProducto('${producto.codigo}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${producto.id})">Eliminar</button>
                </td>
            </tr>
        `;
        tabla.innerHTML += fila;
    });

    calcularTotalInventario(productos);
}

// --- OBTENER Y MOSTRAR PRODUCTOS DESDE LA API (GET) ---
async function mostrarProductos() {
    try {
        const respuesta = await fetch(API_URL);
        if (!respuesta.ok) throw new Error("Error al consultar el inventario");
        
        const productos = await respuesta.json();
        renderizarFilasTabla(productos);
    } catch (error) {
        console.error("Error al conectar con el servidor:", error);
    }
}

// --- BUSCAR PRODUCTO POR CÓDIGO ---
async function buscarProductoPorId() {
    const inputBuscar = document.getElementById("buscarId");
    if (!inputBuscar) return;

    const codigo = inputBuscar.value.trim();

    if (!codigo) {
        mostrarAlerta("Por favor ingresa un código para realizar la búsqueda.", "warning");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/codigo/${codigo}`);

        if (respuesta.status === 404) {
            mostrarAlerta(`No se encontró ningún producto con el código: ${codigo}`, "warning");
            renderizarFilasTabla([]);
            return;
        }

        if (!respuesta.ok) {
            mostrarAlerta("Ocurrió un error al realizar la búsqueda.", "danger");
            return;
        }

        const producto = await respuesta.json();
        // Renderizamos un array con el único producto devuelto por el backend
        renderizarFilasTabla([producto]);

    } catch (error) {
        console.error("Error al buscar producto:", error);
        mostrarAlerta("No se pudo conectar con el servidor para buscar el producto.", "danger");
    }
}

// --- LIMPIAR BÚSQUEDA Y VOLVER A MOSTRAR TODOS ---
function limpiarBusqueda() {
    const inputBuscar = document.getElementById("buscarId");
    if (inputBuscar) inputBuscar.value = "";
    mostrarProductos();
}

// --- CÁLCULO DEL TOTAL ---
function calcularTotalInventario(productos) {
    const totalGeneral = productos.reduce((total, prod) => total + ((prod.precio || 0) * (prod.cantidad || 0)), 0);
    const contenedorTotal = document.getElementById("totalInventarioContainer");
    if (contenedorTotal) {
        contenedorTotal.innerHTML = `Valor total del inventario: <strong>$${totalGeneral.toLocaleString('es-CO')}</strong>`;
    }
}

// --- ELIMINAR PRODUCTO (DELETE) ---
async function eliminarProducto(id) {
    const confirmar = confirm("¿Está seguro de eliminar este producto?");

    if (!confirmar) return;

    try {
        const respuesta = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (respuesta.ok) {
            alert("Producto eliminado correctamente");
            mostrarProductos(); // Recarga la tabla dinámicamente
            cargarResumenMetricas(); // Actualiza tarjetas de index.html
        } else {
            alert("No fue posible eliminar el producto");
        }
    } catch (error) {
        console.error("Error al eliminar el producto:", error);
    }
}

// --- EDITAR PRODUCTO ---
async function editarProducto(codigo) {
    const inputCodigo = document.getElementById("codigo");
    if (!inputCodigo) {
        window.location.href = `registrar.html?codigo=${codigo}`;
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/codigo/${codigo}`);
        if (!respuesta.ok) return;

        const producto = await respuesta.json();
        codigoEditando = producto.id; // Guarda el ID original para el PUT

        // Llenar los campos en el formulario
        inputCodigo.value = producto.codigo || "";
        document.getElementById("nombre").value = producto.nombre || "";
        document.getElementById("categoria").value = producto.categoria || "";
        document.getElementById("proveedor").value = producto.proveedor || "";
        document.getElementById("precio").value = producto.precio || 0;
        document.getElementById("cantidad").value = producto.cantidad || 0;
        document.getElementById("stockMinimo").value = producto.stockMinimo || 0;

        inputCodigo.disabled = true;

        const botonGuardar = document.querySelector("#formProducto button[type='submit']");
        if (botonGuardar) {
            botonGuardar.textContent = "Actualizar Producto";
            botonGuardar.classList.replace("btn-primary", "btn-warning");
        }
    } catch (error) {
        console.error("Error al obtener producto:", error);
    }
}

// --- GUARDAR O ACTUALIZAR (POST / PUT) ---
const formulario = document.getElementById("formProducto");

if (formulario) {
    formulario.addEventListener("submit", async function(event) {
        event.preventDefault();

        const codigo = document.getElementById("codigo").value.trim();
        const precio = Number(document.getElementById("precio").value);
        const cantidad = Number(document.getElementById("cantidad").value);
        const stockMinimo = Number(document.getElementById("stockMinimo").value);

        if (!codigo || precio <= 0 || cantidad < 0 || stockMinimo < 0) {
            mostrarAlerta("Por favor valide los campos antes de enviar", "danger");
            return;
        }

        const productoPayload = {
            codigo: codigo,
            nombre: document.getElementById("nombre").value.trim(),
            categoria: document.getElementById("categoria").value.trim(),
            proveedor: document.getElementById("proveedor").value.trim(),
            precio: precio,
            cantidad: cantidad,
            stockMinimo: stockMinimo
        };

        try {
            let respuesta;
            if (codigoEditando === null) {
                // Petición POST (Crear nuevo)
                respuesta = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(productoPayload)
                });
            } else {
                // Petición PUT (Actualizar existente)
                respuesta = await fetch(`${API_URL}/${codigoEditando}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(productoPayload)
                });
            }

            if (respuesta.ok) {
                const mensajeExito = codigoEditando === null 
                    ? "¡Producto registrado exitosamente en MySQL!" 
                    : "¡Producto actualizado exitosamente!";
                
                mostrarAlerta(mensajeExito, "success");

                codigoEditando = null;
                document.getElementById("codigo").disabled = false;
                
                const botonGuardar = document.querySelector("#formProducto button[type='submit']");
                if (botonGuardar) {
                    botonGuardar.textContent = "Guardar producto";
                    botonGuardar.classList.replace("btn-warning", "btn-primary");
                }

                formulario.reset();
                mostrarProductos();
            } else {
                mostrarAlerta("Ocurrió un error al procesar la solicitud en el servidor.", "danger");
            }
        } catch (error) {
            console.error("Error al guardar:", error);
            mostrarAlerta("No se pudo conectar con el servidor Spring Boot.", "danger");
        }
    });
}

// --- MOSTRAR ALERTAS DINÁMICAS ---
function mostrarAlerta(mensajeTexto, tipo) {
    const divMensaje = document.getElementById("mensaje");
    if (divMensaje) {
        divMensaje.innerHTML = `
            <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
                ${mensajeTexto}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

// --- CARGAR MÉTRICAS DEL RESUMEN EN HOME (INDEX.HTML) ---
async function cargarResumenMetricas() {
    const elemTotal = document.getElementById("totalProductos");
    const elemDisponibles = document.getElementById("totalDisponibles");
    const elemAgotados = document.getElementById("totalAgotados");

    if (!elemTotal || !elemDisponibles || !elemAgotados) return;

    try {
        const respuesta = await fetch(API_URL);
        if (!respuesta.ok) return;

        const productos = await respuesta.json();

        const total = productos.length;
        const disponibles = productos.filter(p => Number(p.cantidad) > 0).length;
        const agotados = productos.filter(p => Number(p.cantidad) === 0).length;

        elemTotal.textContent = total;
        elemDisponibles.textContent = disponibles;
        elemAgotados.textContent = agotados;

    } catch (error) {
        console.error("Error al cargar métricas del inventario:", error);
    }
}

// --- GENERAR REPORTE PDF DEL INVENTARIO ---
async function generarPDF() {
    try {
        // Petición a la API para obtener todos los productos actualizados
        const respuesta = await fetch(API_URL);
        if (!respuesta.ok) {
            mostrarAlerta("No se pudieron obtener los productos para el PDF", "danger");
            return;
        }

        const productos = await respuesta.json();

        if (productos.length === 0) {
            mostrarAlerta("No hay productos en el inventario para exportar a PDF.", "warning");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 1. Encabezado del Documento
        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.text("Reporte General de Inventario", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        const fechaActual = new Date().toLocaleDateString('es-CO', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        doc.text(`Fecha de emisión: ${fechaActual}`, 14, 28);

        // 2. Definir Columnas y Mapear Filas
        const columnas = ["Código", "Nombre", "Categoría", "Proveedor", "Precio", "Stock", "Valor Total"];
        
        let totalInventario = 0;

        const filas = productos.map(prod => {
            const precio = Number(prod.precio) || 0;
            const cantidad = Number(prod.cantidad) || 0;
            const subtotal = precio * cantidad;
            totalInventario += subtotal;

            const proveedorText = (prod.proveedor && prod.proveedor !== "undefined") ? prod.proveedor : "N/A";

            return [
                prod.codigo || "",
                prod.nombre || "",
                prod.categoria || "Sin categoría",
                proveedorText,
                `$${precio.toLocaleString('es-CO')}`,
                cantidad,
                `$${subtotal.toLocaleString('es-CO')}`
            ];
        });

        // 3. Generar Tabla con AutoTable
        doc.autoTable({
            startY: 35,
            head: [columnas],
            body: filas,
            theme: 'striped',
            headStyles: { fillColor: [13, 110, 253] }, // Color Azul Bootstrap
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                4: { halign: 'right' },
                5: { halign: 'center' },
                6: { halign: 'right' }
            }
        });

        // 4. Resumen Final al pie de la tabla
        const posicionFinalY = doc.lastAutoTable.finalY + 12;

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Productos Registrados: ${productos.length}`, 14, posicionFinalY);
        doc.text(`Valor Total del Inventario: $${totalInventario.toLocaleString('es-CO')}`, 14, posicionFinalY + 7);

        // 5. Descargar Archivo PDF
        doc.save(`Reporte_Inventario_${new Date().toISOString().slice(0,10)}.pdf`);

    } catch (error) {
        console.error("Error al generar PDF:", error);
        mostrarAlerta("Ocurrió un error al intentar generar el PDF.", "danger");
    }
}


// --- CARGA INICIAL ---
document.addEventListener("DOMContentLoaded", async function() {
    await mostrarProductos();
    await cargarResumenMetricas();

    const urlParams = new URLSearchParams(window.location.search);
    const codigoUrl = urlParams.get("codigo");

    if (codigoUrl) {
        await editarProducto(codigoUrl);
    }

    // Buscar al presionar la tecla Enter en la casilla (DENTRO DEL DOMCONTENTLOADED)
    const inputBuscar = document.getElementById("buscarId");
    if (inputBuscar) {
        inputBuscar.addEventListener("keypress", function(e) {
            if (e.key === "Enter") buscarProductoPorId();
        });
    }
});