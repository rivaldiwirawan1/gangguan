document.addEventListener("DOMContentLoaded", () => {
  const motion = window.motion;
  if (!motion || typeof motion.animate !== "function") return;
  const { animate, stagger } = motion;

  // Avatar hover subtle scale
  const trigger = document.querySelector(".user-menu-trigger");
  const avatar = document.querySelector(".user-nav .avatar");
  if (trigger && avatar) {
    trigger.addEventListener("mouseenter", () => {
      animate(
        avatar,
        { scale: 1.06, translateY: -2 },
        { duration: 0.18, easing: "ease-out" }
      );
    });
    trigger.addEventListener("mouseleave", () => {
      animate(avatar, { scale: 1, translateY: 0 }, { duration: 0.28, easing: "ease-out" });
    });
  }

  // Animate details dropdown (user menu)
  const details = document.querySelector(".user-menu");
  const menuList = document.querySelector(".user-menu-list");
  if (details && menuList) {
    // ensure hidden by default (CSS also hides it)
    menuList.style.display = "none";

    details.addEventListener("toggle", () => {
      const items = Array.from(menuList.querySelectorAll("li"));
      if (details.open) {
        menuList.style.display = "block";
        animate(menuList, { opacity: [0, 1], transform: ["translateY(-8px)", "translateY(0)"] }, { duration: 260, easing: "ease-out" });
        if (items.length) {
          animate(items, { opacity: [0, 1], transform: ["translateY(-6px)", "translateY(0)"] }, { delay: stagger(60), duration: 260, easing: "ease-out" });
        }
      } else {
        if (items.length) {
          animate(items.reverse(), { opacity: [1, 0], transform: ["translateY(0)", "translateY(-6px)"] }, { delay: stagger(40), duration: 180, easing: "ease-in" }).then(() => {
            animate(menuList, { opacity: [1, 0], transform: ["translateY(0)", "translateY(-8px)"] }, { duration: 140, easing: "ease-in" }).then(() => {
              menuList.style.display = "none";
            });
          });
        } else {
          animate(menuList, { opacity: [1, 0] }, { duration: 140 }).then(() => (menuList.style.display = "none"));
        }
      }
    });
  }

  // Entrance animation for main panels
  const enterEls = document.querySelectorAll(".left-sidebar, .panel, .right-sidebar, .header-title, .header-subtitle");
  if (enterEls.length) {
    animate(enterEls, { opacity: [0, 1], transform: ["translateY(10px)", "translateY(0)"] }, { delay: stagger(40), duration: 420, easing: "ease-out" });
  }
});
