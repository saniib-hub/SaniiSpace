(function () {
  var container = document.getElementById('heroVisual');
  var canvas = document.getElementById('heroCanvas');

  if (!container || !canvas || typeof THREE === 'undefined') {
    return;
  }

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) {
    return;
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 6.5;

  function setSize() {
    var rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  setSize();
  window.addEventListener('resize', setSize);

  // Rotating wireframe icosahedron — the "diagnostic core"
  var icosahedronGeometry = new THREE.IcosahedronGeometry(2, 1);
  var wireframeGeometry = new THREE.WireframeGeometry(icosahedronGeometry);
  var wireframeMaterial = new THREE.LineBasicMaterial({
    color: 0x3ed7cb,
    transparent: true,
    opacity: 0.55
  });
  var wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
  scene.add(wireframe);

  // Particle network floating around it
  var particleCount = 36;
  var positions = new Float32Array(particleCount * 3);
  for (var i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
  }

  var particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  var particleMaterial = new THREE.PointsMaterial({ color: 0x34c759, size: 0.06 });
  var particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Faint lines connecting nearby particles
  var linePositions = [];
  for (var a = 0; a < particleCount; a++) {
    for (var b = a + 1; b < particleCount; b++) {
      var dx = positions[a * 3] - positions[b * 3];
      var dy = positions[a * 3 + 1] - positions[b * 3 + 1];
      var dz = positions[a * 3 + 2] - positions[b * 3 + 2];
      var distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance < 2.1) {
        linePositions.push(positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2]);
        linePositions.push(positions[b * 3], positions[b * 3 + 1], positions[b * 3 + 2]);
      }
    }
  }

  var lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  var lineMaterial = new THREE.LineBasicMaterial({
    color: 0x3ed7cb,
    transparent: true,
    opacity: 0.15
  });
  var connectingLines = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(connectingLines);

  // Pause rendering when the hero scrolls out of view to save battery/CPU
  var isVisible = true;
  if ('IntersectionObserver' in window) {
    var visibilityObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isVisible = entry.isIntersecting;
      });
    });
    visibilityObserver.observe(container);
  }

  // Scroll-driven parallax: as the hero scrolls up out of view, the wireframe
  // and particle field drift at a different rate than the flat page content
  // and pick up extra spin, giving the scene depth instead of a flat card.
  var scrollProgress = 0;
  function updateScrollProgress() {
    var rect = container.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var progress = 1 - (rect.top + rect.height) / (viewportHeight + rect.height);
    scrollProgress = Math.min(Math.max(progress, -1), 1);
  }

  if (!prefersReducedMotion) {
    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
  }

  function animate() {
    requestAnimationFrame(animate);

    if (!isVisible) {
      return;
    }

    if (!prefersReducedMotion) {
      wireframe.rotation.y += 0.0025 + scrollProgress * 0.01;
      wireframe.rotation.x += 0.0009;
      particles.rotation.y += 0.0014;
      connectingLines.rotation.y += 0.0014;

      wireframe.position.y = -scrollProgress * 0.7;
      particles.position.y = -scrollProgress * 0.35;
      connectingLines.position.y = -scrollProgress * 0.35;
      camera.position.x = scrollProgress * 0.4;
    }

    renderer.render(scene, camera);
  }

  animate();
})();
