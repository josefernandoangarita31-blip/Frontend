// 1. Configuración de la URL de Railway con el endpoint exacto del Controller
const API_URL = "https://backend-production-076e5.up.railway.app/api/productos";

// Carga de eventos cuando el DOM está completamente listo
document.addEventListener("DOMContentLoaded", () => {
    // Si estamos en productos.html o registrar.html y existe la tabla, cargamos los datos
    if (document.getElementById("tablaProductos")) {
        mostrarProductos();
    }
    
    // Si existe el formulario de registro, escuchamos el submit
    const formProducto = document.getElementById("formProducto");
    if (formProducto) {
        formProducto.addEventListener("submit", guardarProducto);
    }
});

// ==========================================
// CONSULTAR Y RENDERIZAR PRODUCTOS (GET)
// ==========================================
function mostrarProductos() {
    fetch(API_URL)
        .then(response => {
            if (!response.ok) throw new Error("Error en la respuesta del servidor: " + response.status);
            return response.json();
        })
        .then(productos => {
            renderizarTabla(productos);
        })
        .catch(error => {
            console.error("Error al obtener productos:", error);
            mostrarAlerta("No se pudo conectar con el backend o cargar la lista de productos.", "danger");
        });
}

function renderizarTabla(productos) {
    const tbody = document.getElementById("tablaProductos");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    let totalAcumulado = 0;

    if (productos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No hay productos registrados.</td></tr>`;
        actualizarTotalInventario(0);
        return;
    }

    productos.forEach(p => {
        const valorTotal = (p.precio || 0) * (p.cantidad || 0);
        totalAcumulado += valorTotal;

        // Determinación del estado según stock mínimo
        let badgeEstado = '<span class="badge bg-success">Disponible</span>';
        if (p.cantidad === 0) {
            badgeEstado = '<span class="badge bg-danger">Agotado</span>';
        } else if (p.cantidad <= (p.stockMinimo || 0)) {
            badgeEstado = '<span class="badge bg-warning text-dark">Stock Bajo</span>';
        }

        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td><strong>${p.codigo || ''}</strong></td>
            <td>${p.nombre || ''}</td>
            <td>${p.categoria || ''}</td>
            <td>${p.proveedor || ''}</td>
            <td>$${Number(p.precio || 0).toLocaleString()}</td>
            <td>${p.cantidad || 0}</td>
            <td>${badgeEstado}</td>
            <td>$${valorTotal.toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto('${p.id || p.codigo}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(fila);
    });

    actualizarTotalInventario(totalAcumulado);
}

function actualizarTotalInventario(total) {
    const contenedor = document.getElementById("totalInventarioContainer");
    if (contenedor) {
        contenedor.textContent = `Valor total del inventario: $${total.toLocaleString()}`;
    }
}

// ==========================================
// REGISTRAR NUEVO PRODUCTO (POST)
// ==========================================
function guardarProducto(e) {
    e.preventDefault();

    const productoData = {
        codigo: document.getElementById("codigo").value.trim(),
        nombre: document.getElementById("nombre").value.trim(),
        categoria: document.getElementById("categoria").value.trim(),
        proveedor: document.getElementById("proveedor").value.trim(),
        precio: parseFloat(document.getElementById("precio").value),
        cantidad: parseInt(document.getElementById("cantidad").value),
        stockMinimo: parseInt(document.getElementById("stockMinimo").value)
    };

    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productoData)
    })
    .then(response => {
        if (!response.ok) throw new Error("Error al guardar el producto");
        return response.json();
    })
    .then(() => {
        mostrarAlerta("Producto guardado correctamente con éxito.", "success");
        document.getElementById("formProducto").reset();
        mostrarProductos();
    })
    .catch(error => {
        console.error("Error al registrar:", error);
        mostrarAlerta("No se pudo registrar el producto. Revisa la consola.", "danger");
    });
}

// ==========================================
// ELIMINAR PRODUCTO (DELETE)
// ==========================================
function eliminarProducto(id) {
    if (!confirm("¿Está seguro de eliminar este producto?")) return;

    fetch(`${API_URL}/${id}`, { method: "DELETE" })
        .then(response => {
            if (!response.ok) throw new Error("Error al eliminar");
            mostrarAlerta("Producto eliminado correctamente.", "warning");
            mostrarProductos();
        })
        .catch(error => {
            console.error("Error al eliminar:", error);
            mostrarAlerta("No se pudo eliminar el producto.", "danger");
        });
}

// ==========================================
// BÚSQUEDA INDIVIDUAL (GET por ID/Código)
// ==========================================
function buscarProductoPorId() {
    const busqueda = document.getElementById("buscarId").value.trim();
    if (!busqueda) {
        mostrarAlerta("Por favor ingrese un código o ID para buscar.", "warning");
        return;
    }

    fetch(`${API_URL}/${busqueda}`)
        .then(response => {
            if (!response.ok) throw new Error("Producto no encontrado");
            return response.json();
        })
        .then(producto => {
            renderizarTabla([producto]);
        })
        .catch(() => {
            mostrarAlerta("No se encontró ningún producto con ese código/ID.", "danger");
        });
}

function limpiarBusqueda() {
    const inputBusqueda = document.getElementById("buscarId");
    if (inputBusqueda) inputBusqueda.value = "";
    mostrarProductos();
}

// ==========================================
// GENERACIÓN DE REPORTES PDF (jsPDF + AutoTable)
// ==========================================
function generarPDF() {
    if (typeof window.jspdf === "undefined") {
        mostrarAlerta("La librería jsPDF no está disponible.", "danger");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Reporte General de Inventario", 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 28);

    doc.autoTable({
        html: ".table",
        startY: 35,
        columns: [0, 1, 2, 3, 4, 5, 6, 7], // Excluye la columna 'Acciones'
        headStyles: { fillColor: [33, 37, 41] },
        styles: { fontSize: 8 }
    });

    doc.save("Reporte_Inventario.pdf");
}

// ==========================================
// HELPER PARA ALERTAS DINÁMICAS
// ==========================================
function mostrarAlerta(mensaje, tipo) {
    const contenedor = document.getElementById("mensaje");
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    setTimeout(() => { contenedor.innerHTML = ""; }, 4000);
}