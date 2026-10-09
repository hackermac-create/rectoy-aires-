/* =========================================================
   RECTOY-AIRES — JAVASCRIPT V3
   Interactions du site officiel
========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       OUTILS
    ===================================================== */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    const safeText = (value) =>
        String(value ?? "").replace(/[<>]/g, "");

    /* =====================================================
       ANNÉE AUTOMATIQUE
    ===================================================== */

    const year = $("#year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    /* =====================================================
       MENU MOBILE
    ===================================================== */

    const menuToggle =
        $(".menu-toggle") ||
        $("#menuToggle") ||
        $(".nav-toggle");

    const nav =
        $(".nav-menu") ||
        $(".nav-links") ||
        $("nav");

    if (menuToggle && nav) {

        menuToggle.addEventListener("click", () => {

            const opened =
                menuToggle.getAttribute("aria-expanded") === "true";

            menuToggle.setAttribute(
                "aria-expanded",
                String(!opened)
            );

            menuToggle.classList.toggle("active");
            nav.classList.toggle("active");
            document.body.classList.toggle("menu-open");

        });

        $$(".nav-menu a, .nav-links a, nav a").forEach(link => {

            link.addEventListener("click", () => {

                menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );

                menuToggle.classList.remove("active");
                nav.classList.remove("active");
                document.body.classList.remove("menu-open");

            });

        });
    }

    /* =====================================================
       HEADER AU SCROLL
    ===================================================== */

    const header = $("#header");

    const updateHeader = () => {

        if (!header) return;

        if (window.scrollY > 40) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    };

    updateHeader();

    window.addEventListener(
        "scroll",
        updateHeader,
        { passive: true }
    );

    /* =====================================================
       NAVIGATION FLUIDE
    ===================================================== */

    $$('a[href^="#"]').forEach(link => {

        link.addEventListener("click", event => {

            const href = link.getAttribute("href");

            if (
                !href ||
                href === "#" ||
                href.length <= 1
            ) {
                return;
            }

            const target = $(href);

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        });

    });

    /* =====================================================
       ANIMATIONS AU SCROLL
    ===================================================== */

    const revealElements = $$(
        ".reveal, .fade-up, .fade-in, .slide-up, .animate-on-scroll"
    );

    if ("IntersectionObserver" in window) {

        const observer = new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "visible",
                            "active",
                            "show"
                        );

                        observer.unobserve(entry.target);
                    }

                });

            },
            {
                threshold: 0.12
            }
        );

        revealElements.forEach(element => {
            observer.observe(element);
        });

    } else {

        revealElements.forEach(element => {
            element.classList.add("visible", "active", "show");
        });

    }

    /* =====================================================
       COMPTEURS ANIMÉS
    ===================================================== */

    const counters = $$(
        "[data-counter], .counter, .stat-number"
    );

    const animateCounter = element => {

        if (element.dataset.counterAnimated === "true") {
            return;
        }

        element.dataset.counterAnimated = "true";

        const raw =
            element.dataset.counter ||
            element.textContent ||
            "0";

        const number =
            parseInt(
                String(raw).replace(/[^\d]/g, ""),
                10
            ) || 0;

        const suffix =
            element.dataset.suffix ||
            (String(raw).match(/[^\d]+$/) || [""])[0];

        let start = 0;

        const duration = 1200;
        const startTime = performance.now();

        const step = now => {

            const progress = Math.min(
                (now - startTime) / duration,
                1
            );

            const eased =
                1 - Math.pow(1 - progress, 3);

            start = Math.floor(number * eased);

            element.textContent =
                start.toLocaleString("fr-FR") +
                suffix;

            if (progress < 1) {
                requestAnimationFrame(step);
            }

        };

        requestAnimationFrame(step);
    };

    if ("IntersectionObserver" in window) {

        const counterObserver =
            new IntersectionObserver(entries => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        animateCounter(entry.target);

                        counterObserver.unobserve(
                            entry.target
                        );

                    }

                });

            });

        counters.forEach(counter => {
            counterObserver.observe(counter);
        });

    } else {

        counters.forEach(animateCounter);

    }

    /* =====================================================
       FALLBACK IMAGES
    ===================================================== */

    $$("img").forEach(image => {

        image.addEventListener("error", () => {

            if (image.dataset.fallbackUsed === "true") {
                return;
            }

            image.dataset.fallbackUsed = "true";

            image.src = "src/logo.jpeg";

            image.classList.add("image-fallback");

        });

    });

    /* =====================================================
       7 PROFILS RECTOY-AIRES
    ===================================================== */

    const profiles = {

        emmanuel: {
            name: "Ako Emmanuel Yann",
            role: "Fondateur",
            domain: "Technologie • Informatique • Innovation",
            image: "src/emmanuel.jpeg",
            bio:
                "Fondateur de RECTOY-AIRES, engagé dans le développement informatique, l'innovation technologique et la conception de solutions numériques adaptées aux entreprises et aux populations.",
            responsibilities: [
                "Vision technologique",
                "Développement informatique",
                "Innovation",
                "Pilotage des projets numériques",
                "Stratégie technologique"
            ]
        },

        louoba: {
            name: "Aleba Louoba Demene Carelle Emmanuella",
            role: "Cofondatrice",
            domain: "Stratégie • Organisation • Développement",
            image: "src/louoba.jpeg",
            bio:
                "Actrice de la structuration et du développement de RECTOY-AIRES, avec un rôle orienté vers l'organisation, la coordination et l'accompagnement stratégique.",
            responsibilities: [
                "Organisation",
                "Coordination",
                "Développement",
                "Structuration",
                "Relations professionnelles"
            ]
        },

        jeanDaniel: {
            name: "Jean-Daniel",
            role: "Membre de l'équipe",
            domain: "Technologie • Solutions numériques",
            image: "src/jean-daniel.jpeg",
            bio:
                "Contribue au développement des solutions technologiques et à la réalisation des projets numériques de RECTOY-AIRES.",
            responsibilities: [
                "Solutions numériques",
                "Participation aux projets",
                "Technologie",
                "Support technique"
            ]
        },

        odilon: {
            name: "Odilon",
            role: "Membre de l'équipe",
            domain: "Technologie • Développement",
            image: "src/odilon.jpeg",
            bio:
                "Participe à la réalisation des projets et aux activités technologiques de RECTOY-AIRES.",
            responsibilities: [
                "Développement",
                "Production",
                "Solutions technologiques",
                "Appui aux projets"
            ]
        },

        marilyne: {
            name: "Marilyne",
            role: "Membre de l'équipe",
            domain: "Communication • Développement",
            image: "src/marilyne.jpeg",
            bio:
                "Participe aux activités de développement, de communication et de valorisation des solutions RECTOY-AIRES.",
            responsibilities: [
                "Communication",
                "Valorisation des projets",
                "Développement",
                "Coordination"
            ]
        },

        kablan: {
            name: "Kablan",
            role: "Membre de l'équipe",
            domain: "Technologie • Innovation",
            image: "src/kablan.jpeg",
            bio:
                "Contribue aux projets technologiques et à la mise en œuvre de solutions innovantes.",
            responsibilities: [
                "Technologie",
                "Innovation",
                "Développement",
                "Appui aux projets"
            ]
        },

        profil7: {
            name: "Équipe RECTOY-AIRES",
            role: "Coordination & Partenariats",
            domain: "Organisation • Partenariats • Développement",
            image: "src/logo.jpeg",
            bio:
                "Profil dédié à la coordination entre les partenaires, les collaborateurs et la structure RECTOY-AIRES.",
            responsibilities: [
                "Coordination des partenaires",
                "Relations professionnelles",
                "Organisation",
                "Développement de partenariats"
            ]
        }
    };

    /* =====================================================
       MODALE PROFIL
    ===================================================== */

    const profileModal = $("#profileModal");

    const profilePhoto =
        $("#profilePhoto");

    const profileRole =
        $("#profileRole");

    const profileName =
        $("#profileName");

    const profileDomain =
        $("#profileDomain");

    const profileBio =
        $("#profileBio");

    const profileResponsibilities =
        $("#profileResponsibilities");

    const profileContact =
        $("#profileContact");

    const closeProfile =
        $("#closeProfile");

    const openProfile = key => {

        if (!profileModal) return;

        const profile = profiles[key];

        if (!profile) {
            console.warn(
                "Profil introuvable :",
                key
            );
            return;
        }

        if (profilePhoto) {
            profilePhoto.src = profile.image;
            profilePhoto.alt = profile.name;
        }

        if (profileRole) {
            profileRole.textContent =
                profile.role;
        }

        if (profileName) {
            profileName.textContent =
                profile.name;
        }

        if (profileDomain) {
            profileDomain.textContent =
                profile.domain;
        }

        if (profileBio) {
            profileBio.textContent =
                profile.bio;
        }

        if (profileResponsibilities) {

            profileResponsibilities.innerHTML =
                profile.responsibilities
                    .map(
                        item =>
                            `<li>${safeText(item)}</li>`
                    )
                    .join("");

        }

        if (profileContact) {

            profileContact.href =
                "mailto:contact@rectoy-aires.com";

        }

        profileModal.classList.add("active");
        profileModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "modal-open"
        );

    };

    const closeProfileModal = () => {

        if (!profileModal) return;

        profileModal.classList.remove("active");

        profileModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "modal-open"
        );
    };

    /* Boutons profil */

    $$(
        "[data-profile], .profile-card, .team-card"
    ).forEach(card => {

        card.addEventListener("click", event => {

            const button =
                event.target.closest(
                    "button, a"
                );

            const key =
                card.dataset.profile ||
                card.dataset.person ||
                card.dataset.member;

            if (key) {

                if (
                    button &&
                    button.tagName === "A" &&
                    button.getAttribute("href") &&
                    button.getAttribute("href") !== "#"
                ) {
                    return;
                }

                event.preventDefault();

                openProfile(key);
            }

        });

    });

    if (closeProfile) {

        closeProfile.addEventListener(
            "click",
            closeProfileModal
        );

    }

    if (profileModal) {

        profileModal.addEventListener(
            "click",
            event => {

                if (
                    event.target === profileModal
                ) {
                    closeProfileModal();
                }

            }
        );

    }

    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {
                closeProfileModal();
            }

        }
    );

    /* =====================================================
       ASSISTANT IA RECTOY-AIRES
    ===================================================== */

    const aiLauncher =
        $("#aiLauncher");

    const aiPanel =
        $("#aiPanel");

    const aiClose =
        $("#aiClose");

    const aiMessages =
        $("#aiMessages");

    const aiQuick =
        $("#aiQuick");

    const aiForm =
        $("#aiForm");

    const aiInput =
        $("#aiInput");

    const handoffButton =
        $("#handoffButton");

    const assistantKnowledge = {

        bonjour:
            "Bonjour 👋 Je suis l'assistant RECTOY-AIRES. Je peux vous présenter nos services, nos projets, notre équipe ou vous orienter vers un conseiller.",

        services:
            "RECTOY-AIRES intervient notamment dans le développement informatique, la digitalisation, la cybersécurité, l'audiovisuel, la communication numérique, l'innovation technologique, les solutions mobiles et l'électronique.",

        projets:
            "Notre projet phare est RECTOY BUSINESS. Nous développons également des solutions numériques et des projets liés au commerce et à la transformation numérique.",

        rectoy:
            "RECTOY-AIRES est une entreprise technologique africaine qui développe des solutions numériques destinées aux entreprises, professionnels et populations.",

        business:
            "RECTOY BUSINESS est notre projet phare : une solution destinée à accompagner les entreprises dans leur gestion, leur organisation et leur transformation numérique.",

        contact:
            "Vous pouvez utiliser la section Contact du site pour nous transmettre votre demande. Si vous souhaitez un accompagnement humain, je peux également vous orienter vers un web conseiller.",

        conseiller:
            "Bien sûr. Cliquez sur « Passer à un web conseiller » afin de transmettre votre demande à un interlocuteur humain.",

        investissement:
            "RECTOY-AIRES cherche à développer des partenariats stratégiques et à attirer des investisseurs pour accélérer ses solutions technologiques et son expansion.",

        default:
            "Je peux vous renseigner sur RECTOY-AIRES, nos services, RECTOY BUSINESS, nos projets, notre équipe ou vous orienter vers un web conseiller."
    };

    const getAIResponse = message => {

        const text =
            message
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

        if (
            text.includes("bonjour") ||
            text.includes("salut") ||
            text.includes("hello") ||
            text.includes("bonsoir")
        ) {
            return assistantKnowledge.bonjour;
        }

        if (
            text.includes("service") ||
            text.includes("faites") ||
            text.includes("proposez")
        ) {
            return assistantKnowledge.services;
        }

        if (
            text.includes("projet") ||
            text.includes("application")
        ) {
            return assistantKnowledge.projets;
        }

        if (
            text.includes("rectoy business") ||
            text.includes("business")
        ) {
            return assistantKnowledge.business;
        }

        if (
            text.includes("investisseur") ||
            text.includes("financement") ||
            text.includes("investissement")
        ) {
            return assistantKnowledge.investissement;
        }

        if (
            text.includes("contact") ||
            text.includes("joindre") ||
            text.includes("telephone")
        ) {
            return assistantKnowledge.contact;
        }

        if (
            text.includes("conseiller") ||
            text.includes("humain")
        ) {
            return assistantKnowledge.conseiller;
        }

        if (
            text.includes("rectoy") ||
            text.includes("entreprise")
        ) {
            return assistantKnowledge.rectoy;
        }

        return assistantKnowledge.default;
    };

    const addMessage = (
        message,
        type = "assistant"
    ) => {

        if (!aiMessages) return;

        const bubble =
            document.createElement("div");

        bubble.className =
            `ai-message ${type}`;

        bubble.textContent = message;

        aiMessages.appendChild(bubble);

        aiMessages.scrollTop =
            aiMessages.scrollHeight;

    };

    const openAI = () => {

        if (!aiPanel) return;

        aiPanel.classList.add("active");

        if (aiLauncher) {

            aiLauncher.setAttribute(
                "aria-expanded",
                "true"
            );

        }

        if (
            aiMessages &&
            !aiMessages.dataset.initialized
        ) {

            addMessage(
                assistantKnowledge.bonjour,
                "assistant"
            );

            aiMessages.dataset.initialized =
                "true";
        }

        setTimeout(() => {

            if (aiInput) {
                aiInput.focus();
            }

        }, 150);

    };

    const closeAI = () => {

        if (!aiPanel) return;

        aiPanel.classList.remove("active");

        if (aiLauncher) {

            aiLauncher.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    };

    if (aiLauncher) {

        aiLauncher.addEventListener(
            "click",
            () => {

                if (
                    aiPanel &&
                    aiPanel.classList.contains("active")
                ) {
                    closeAI();
                } else {
                    openAI();
                }

            }
        );

    }

    if (aiClose) {

        aiClose.addEventListener(
            "click",
            closeAI
        );

    }

    if (aiForm) {

        aiForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                if (!aiInput) return;

                const message =
                    aiInput.value.trim();

                if (!message) return;

                addMessage(
                    message,
                    "user"
                );

                aiInput.value = "";

                setTimeout(() => {

                    addMessage(
                        getAIResponse(message),
                        "assistant"
                    );

                }, 450);

            }
        );

    }

    /* Boutons rapides */

    if (aiQuick) {

        $$(
            "button, [data-question]",
            aiQuick
        ).forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const question =
                        button.dataset.question ||
                        button.textContent.trim();

                    if (!question) return;

                    openAI();

                    if (aiInput) {
                        aiInput.value =
                            question;

                        if (aiForm) {
                            aiForm.dispatchEvent(
                                new Event("submit", {
                                    bubbles: true,
                                    cancelable: true
                                })
                            );
                        }
                    }

                }
            );

        });

    }

    /* =====================================================
       TRANSFERT WEB CONSEILLER
    ===================================================== */

    if (handoffButton) {

        handoffButton.addEventListener(
            "click",
            () => {

                const message =
                    encodeURIComponent(
                        "Bonjour RECTOY-AIRES, je souhaite être mis en relation avec un web conseiller."
                    );

                /*
                 * Numéro WhatsApp déjà utilisé
                 * dans le projet RECTOY-AIRES.
                 */

                const whatsappURL =
                    `https://wa.me/2250705801517?text=${message}`;

                window.open(
                    whatsappURL,
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );

    }

    /* =====================================================
       FILTRES ACTUALITÉS
    ===================================================== */

    const filterButtons =
        $$("[data-filter]");

    const newsCards =
        $$("[data-type]");

    filterButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const filter =
                    button.dataset.filter;

                filterButtons.forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );

                button.classList.add(
                    "active"
                );

                newsCards.forEach(card => {

                    const type =
                        card.dataset.type;

                    const visible =
                        filter === "all" ||
                        filter === type;

                    card.style.display =
                        visible ? "" : "none";

                });

            }
        );

    });

    /* =====================================================
       EFFET 3D SUR LES CARTES
    ===================================================== */

    const interactiveCards =
        $$(".service-card, .project-card, .profile-card, .team-card");

    interactiveCards.forEach(card => {

        card.addEventListener(
            "mousemove",
            event => {

                if (
                    window.innerWidth < 768
                ) {
                    return;
                }

                const rect =
                    card.getBoundingClientRect();

                const x =
                    event.clientX -
                    rect.left;

                const y =
                    event.clientY -
                    rect.top;

                const centerX =
                    rect.width / 2;

                const centerY =
                    rect.height / 2;

                const rotateY =
                    ((x - centerX) /
                        centerX) * 3;

                const rotateX =
                    ((centerY - y) /
                        centerY) * 3;

                card.style.transform =
                    `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;

            }
        );

        card.addEventListener(
            "mouseleave",
            () => {

                card.style.transform = "";

            }
        );

    });

    /* =====================================================
       LIENS EXTERNES
    ===================================================== */

    $$('a[target="_blank"]').forEach(link => {

        const rel =
            link.getAttribute("rel") || "";

        if (!rel.includes("noopener")) {

            link.setAttribute(
                "rel",
                `${rel} noopener noreferrer`.trim()
            );

        }

    });

    /* =====================================================
       CONTACT — FORMSPREE
    ===================================================== */

    const contactForm =
        $("#contactForm");

    if (contactForm) {

        contactForm.addEventListener(
            "submit",
            async event => {

                const action =
                    contactForm.getAttribute("action");

                if (
                    !action ||
                    !action.includes("formspree")
                ) {
                    return;
                }

                event.preventDefault();

                const submitButton =
                    contactForm.querySelector(
                        'button[type="submit"]'
                    );

                const originalText =
                    submitButton
                        ? submitButton.textContent
                        : "";

                if (submitButton) {

                    submitButton.disabled = true;

                    submitButton.textContent =
                        "Envoi en cours...";

                }

                try {

                    const response =
                        await fetch(
                            action,
                            {
                                method: "POST",
                                body:
                                    new FormData(
                                        contactForm
                                    ),
                                headers: {
                                    Accept:
                                        "application/json"
                                }
                            }
                        );

                    if (!response.ok) {
                        throw new Error(
                            "Erreur lors de l'envoi"
                        );
                    }

                    contactForm.reset();

                    alert(
                        "Votre message a bien été envoyé à RECTOY-AIRES."
                    );

                } catch (error) {

                    console.error(
                        "Erreur formulaire :",
                        error
                    );

                    alert(
                        "Impossible d'envoyer le message pour le moment. Veuillez réessayer ou utiliser WhatsApp."
                    );

                } finally {

                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.textContent =
                            originalText;

                    }

                }

            }
        );

    }

    /* =====================================================
       CONSOLE DE DIAGNOSTIC
    ===================================================== */

    console.log(
        "%c RECTOY-AIRES ",
        "font-size:18px;font-weight:bold;"
    );

    console.log(
        "Site officiel initialisé avec succès."
    );

    console.log(
        "Assistant IA :",
        Boolean(aiLauncher && aiPanel)
    );

    console.log(
        "Profils disponibles :",
        Object.keys(profiles).length
    );

});