console.log("App initialized");

// Funcionalidad del menú desplegable de Catálogos
document.addEventListener("DOMContentLoaded", function() {
  const catalogosToggle = document.getElementById("catalogosToggle");
  const catalogosMenu = document.getElementById("catalogosMenu");
  const catalogosArrow = document.getElementById("catalogosArrow");

  if (catalogosToggle && catalogosMenu && catalogosArrow) {
    catalogosToggle.addEventListener("click", function() {
      const isHidden = catalogosMenu.classList.contains("t-hidden");
      
      if (isHidden) {
        catalogosMenu.classList.remove("t-hidden");
        catalogosMenu.classList.add("t-block");
        catalogosArrow.classList.add("t-rotate-180");
      } else {
        catalogosMenu.classList.add("t-hidden");
        catalogosMenu.classList.remove("t-block");
        catalogosArrow.classList.remove("t-rotate-180");
      }
    });
  }
});