document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lenis Smooth Scroll
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Register GSAP Plugins
  gsap.registerPlugin(TextPlugin, ScrollTrigger);

  // Sync ScrollTrigger with Lenis
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  // 2. Initial State Setup
  gsap.set("#preloader-text", { opacity: 0 });
  gsap.set(".section-hero", { opacity: 0 });
  gsap.set(".hero-title, .hero-subtitle, .scroll-indicator", { y: 40, opacity: 0 });

  // Use SplitType to prepare massive typography for 3D scatter
  const typoText = new SplitType('.typo-text', { types: 'chars' });

  // 3. The Preloader Sequence (Optimized)
  const preloaderTl = gsap.timeline();
  
  preloaderTl.to("#preloader-text", {
    duration: 0.5, opacity: 1,
    text: "0x7F4B2... INITIALIZING AUCTION VAULT ...0x9A1C",
    ease: "power2.inOut"
  })
  .to({}, { duration: 0.5 })
  .to("#preloader-text", {
    duration: 1.2, text: "Privacy-First. Decentralized. Unstoppable.", ease: "none"
  })
  .to({}, { duration: 0.6 })
  .to("#preloader-text", { duration: 0.3, opacity: 0, y: -20, ease: "power2.in" })
  .to("#preloader-icon", { duration: 0.5, scale: 1, opacity: 1, ease: "back.out(2)" }, "-=0.1")
  
  // Optimized Iris Expansion (reduced scale & box-shadow overdraw)
  .to("#preloader-icon", { 
    duration: 0.8, 
    scale: 40, 
    opacity: 0, 
    ease: "power3.in" 
  }, "+=0.2")
  .to("#preloader", {
    duration: 0.2, opacity: 0,
    onComplete: () => { document.getElementById('preloader').style.display = 'none'; }
  }, "-=0.4")
  
  // Hero Entry
  .to(".section-hero", { duration: 0.1, opacity: 1 }, "-=0.2")
  .to(".hero-title", { duration: 1.2, y: 0, opacity: 1, ease: "power4.out" }, "-=0.1")
  .to(".hero-subtitle", { duration: 1.2, y: 0, opacity: 1, ease: "power4.out" }, "-=1.0")
  .to(".scroll-indicator", { duration: 1, y: 0, opacity: 0.4, ease: "power3.out" }, "-=0.8");

  // 4. 3D Magnetic Typography Scatter (Optimized: No blur filters)
  // Start the chars completely scattered in 3D space
  gsap.set(typoText.chars, {
    opacity: 0,
    x: () => gsap.utils.random(-300, 300),
    y: () => gsap.utils.random(-300, 300),
    z: () => gsap.utils.random(-500, 500),
    rotationX: () => gsap.utils.random(-180, 180),
    rotationY: () => gsap.utils.random(-180, 180),
    rotationZ: () => gsap.utils.random(-90, 90),
    force3D: true
  });

  // As user scrolls, snap them magnetically into place
  gsap.to(typoText.chars, {
    opacity: 1,
    x: 0, y: 0, z: 0,
    rotationX: 0, rotationY: 0, rotationZ: 0,
    stagger: {
      each: 0.02,
      from: "random" 
    },
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".section-typo",
      start: "top center+=20%",
      end: "bottom center",
      scrub: 1.5,
    }
  });

  // 5. The Glass Matrix 3D Flip (Optimized: No blur filters)
  gsap.set(".bento-card", {
    rotationY: -180,
    z: -400,
    opacity: 0,
    force3D: true
  });

  gsap.to(".bento-card", {
    rotationY: 0,
    z: 0,
    opacity: 1,
    stagger: 0.15,
    duration: 1.5,
    ease: "expo.out",
    scrollTrigger: {
      trigger: ".section-features",
      start: "top center+=30%",
      toggleActions: "play none none reverse"
    }
  });

  // 6. Auth Section Reveal
  gsap.fromTo(".landing-auth-wrapper", 
    { scale: 0.8, opacity: 0, y: 100 },
    {
      scale: 1,
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: "power4.out",
      scrollTrigger: {
        trigger: ".section-auth",
        start: "top center+=10%",
        toggleActions: "play none none reverse"
      }
    }
  );
});
