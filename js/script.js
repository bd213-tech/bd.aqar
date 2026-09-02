document.addEventListener('DOMContentLoaded', () => {
    const isAuthPage = document.body.classList.contains('login-page') || document.body.classList.contains('register-page');
    const authToken = sessionStorage.getItem('bd_aqar_token');
    if (!isAuthPage && !authToken) {
        window.location.replace('login.html');
        return;
    }

    const translations = {
        en: {
            Home: 'Home', Properties: 'Properties', 'Sell Property': 'Sell Property', Dashboard: 'Dashboard', About: 'About', Contact: 'Contact', Login: 'Login', 'Post Property': 'Post Property', 'Create Account': 'Create Account', 'Contact us': 'Contact us', 'View Details →': 'View Details →', 'Explore Properties': 'Explore Properties', 'Sell Your Property': 'Sell Your Property', 'Chat with BD AI →': 'Chat with BD AI →', 'Contact Seller': 'Contact Seller', WhatsApp: 'WhatsApp', 'Send Message →': 'Send Message →', 'Submit for Review': 'Submit for Review'
        },
        fr: {
            Home: 'Accueil', Properties: 'Biens immobiliers', 'Sell Property': 'Vendre un bien', Dashboard: 'Tableau de bord', About: 'À propos', Contact: 'Contact', Login: 'Connexion', 'Post Property': 'Publier un bien', 'Create Account': 'Créer un compte', 'Contact us': 'Nous contacter', 'View Details →': 'Voir les détails →', 'Explore Properties': 'Voir les biens', 'Sell Your Property': 'Vendre votre bien', 'Chat with BD AI →': 'Discuter avec BD AI →', 'Contact Seller': 'Contacter le vendeur', WhatsApp: 'WhatsApp', 'Send Message →': 'Envoyer le message →', 'Submit for Review': 'Envoyer pour validation'
        },
        ar: {
            Home: 'الرئيسية', Properties: 'العقارات', 'Sell Property': 'بيع عقار', Dashboard: 'لوحة التحكم', About: 'من نحن', Contact: 'اتصل بنا', Login: 'تسجيل الدخول', 'Post Property': 'نشر عقار', 'Create Account': 'إنشاء حساب', 'Contact us': 'تواصل معنا', 'View Details →': 'عرض التفاصيل ←', 'Explore Properties': 'استكشف العقارات', 'Sell Your Property': 'بع عقارك', 'Chat with BD AI →': 'تحدث مع BD AI ←', 'Contact Seller': 'اتصل بالمالك', WhatsApp: 'واتساب', 'Send Message →': 'إرسال الرسالة ←', 'Submit for Review': 'إرسال للمراجعة'
        }
    };
    const languageNames = { en: 'EN', fr: 'FR', ar: 'ع' };
    const supportedLanguages = ['en', 'fr', 'ar'];
    const wilayas = ['Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Bejaia', 'Biskra', 'Bechar', 'Blida', 'Bouira', 'Tamanrasset', 'Tebessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Algiers', 'Djelfa', 'Jijel', 'Setif', 'Saida', 'Skikda', 'Sidi Bel Abbes', 'Annaba', 'Guelma', 'Constantine', 'Medea', 'Mostaganem', 'M’Sila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh', 'Illizi', 'Bordj Bou Arreridj', 'Boumerdes', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued', 'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Ain Defla', 'Naama', 'Ain Temouchent', 'Ghardaia', 'Relizane', 'Timimoun', 'Bordj Badji Mokhtar', 'Ouled Djellal', 'Beni Abbes', 'In Salah', 'In Guezzam', 'Touggourt', 'Djanet', 'El M’Ghair', 'El Meniaa'];
    const originalText = new WeakMap();
    const translatePage = (language) => {
        const dictionary = translations[language];
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        document.body.classList.toggle('arabic-layout', language === 'ar');
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        textNodes.forEach((node) => {
            if (!originalText.has(node)) originalText.set(node, node.nodeValue);
            const source = originalText.get(node);
            const trimmed = source.trim();
            if (dictionary[trimmed]) node.nodeValue = source.replace(trimmed, dictionary[trimmed]);
        });
        document.querySelectorAll('[placeholder]').forEach((field) => {
            const key = field.getAttribute('data-placeholder-key') || field.getAttribute('placeholder');
            if (dictionary[key]) { field.setAttribute('data-placeholder-key', key); field.placeholder = dictionary[key]; }
        });
        const languageButton = document.querySelector('.language-switcher');
        if (languageButton) languageButton.textContent = languageNames[language];
        localStorage.setItem('bd_aqar_language', language);
    };
    const languageSwitcher = document.createElement('button');
    languageSwitcher.type = 'button';
    languageSwitcher.className = 'language-switcher';
    languageSwitcher.setAttribute('aria-label', 'Change language');
    const navActions = document.querySelector('.nav-actions');
    if (navActions) navActions.prepend(languageSwitcher);
    else document.querySelector('.login-header, .register-header')?.append(languageSwitcher);
    let currentLanguage = supportedLanguages.includes(localStorage.getItem('bd_aqar_language')) ? localStorage.getItem('bd_aqar_language') : 'en';
    languageSwitcher.addEventListener('click', () => {
        currentLanguage = supportedLanguages[(supportedLanguages.indexOf(currentLanguage) + 1) % supportedLanguages.length];
        translatePage(currentLanguage);
    });
    translatePage(currentLanguage);

    document.querySelectorAll('input[name="phone"]').forEach((phoneInput) => {
        phoneInput.addEventListener('input', () => {
            phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
        });
    });

    document.querySelectorAll('select[name="wilaya"], #wilaya').forEach((select) => {
        const firstOption = select.options[0];
        select.replaceChildren(firstOption);
        wilayas.forEach((wilaya) => {
            const option = document.createElement('option');
            option.value = wilaya.toLowerCase().replaceAll(' ', '-').replace(/[’']/g, '');
            option.textContent = wilaya;
            select.append(option);
        });
    });

    const homeSearch = document.querySelector('.hero .search-box');
    if (homeSearch) {
        const tabs = homeSearch.querySelectorAll('.tab');
        tabs.forEach((tab) => tab.addEventListener('click', () => {
            tabs.forEach((item) => item.classList.remove('active'));
            tab.classList.add('active');
        }));
        homeSearch.querySelector('.search-btn')?.addEventListener('click', () => {
            const fields = homeSearch.querySelectorAll('.search-field');
            const params = new URLSearchParams();
            const location = fields[0]?.querySelector('input')?.value.trim();
            const type = fields[1]?.querySelector('select')?.value;
            const min = fields[2]?.querySelector('input')?.value;
            const max = fields[3]?.querySelector('input')?.value;
            const mode = homeSearch.querySelector('.tab.active')?.textContent.trim().toLowerCase();
            if (location) params.set('location', location);
            if (type && type !== 'All Types') params.set('type', type.toLowerCase());
            if (min) params.set('min', min);
            if (max) params.set('max', max);
            if (mode) params.set('transaction', mode === 'buy' ? 'sale' : 'rent');
            window.location.href = `properties.html?${params.toString()}`;
        });
    }

    const apiRequest = async (endpoint, options = {}) => {
        const response = await fetch(endpoint, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Something went wrong.');
        return data;
    };

    const showFormError = (element, error) => {
        if (!element) return;
        element.textContent = error.message;
        element.classList.add('is-visible');
        element.style.color = '#c0392b';
    };

    const fallbackImages = {
        'property1.jpg': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
        'property2.jpg': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
        'property3.jpg': 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80'
    };
    document.querySelectorAll('img[src^="images/"]').forEach((image) => {
        image.addEventListener('error', () => {
            const filename = image.src.split('/').pop();
            if (fallbackImages[filename]) image.src = fallbackImages[filename];
        }, { once: true });
    });

    document.querySelectorAll('.favorite-btn, .gallery-favorite').forEach((button) => {
        button.addEventListener('click', () => {
            const active = button.classList.toggle('is-favorite');
            button.setAttribute('aria-pressed', String(active));
            button.textContent = active ? '♥' : '♡';
        });
    });

    const photoInput = document.querySelector('#property-photo');
    const photoPreview = document.querySelector('#photo-preview');
    if (photoInput && photoPreview) {
        photoInput.addEventListener('change', () => {
            const file = photoInput.files[0];
            if (!file) {
                photoPreview.removeAttribute('src');
                photoPreview.hidden = true;
                return;
            }
            const validTypes = ['image/jpeg', 'image/png'];
            const maxFileSize = 5 * 1024 * 1024;
            if (!validTypes.includes(file.type) || file.size > maxFileSize) {
                photoInput.value = '';
                photoPreview.removeAttribute('src');
                photoPreview.hidden = true;
                window.alert('Please choose a JPG or PNG image smaller than 5 MB.');
                return;
            }
            photoPreview.src = URL.createObjectURL(file);
            photoPreview.hidden = false;
        });
    }

    const contactForm = document.querySelector('#contact-form');
    const contactMessage = document.querySelector('#contact-message');
    if (contactForm && contactMessage) {
        contactForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!contactForm.checkValidity()) {
                contactForm.reportValidity();
                return;
            }
            apiRequest('/api/contact', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(contactForm))) })
                .then((data) => { contactMessage.textContent = data.message; contactMessage.style.color = '#16804b'; contactMessage.classList.add('is-visible'); contactForm.reset(); })
                .catch((error) => showFormError(contactMessage, error));
        });
    }

    const propertyForm = document.querySelector('#property-form');
    const propertyMessage = document.querySelector('#form-message');
    if (propertyForm && propertyMessage) {
        propertyForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!propertyForm.checkValidity()) { propertyForm.reportValidity(); return; }
            try {
                const token = sessionStorage.getItem('bd_aqar_token');
                const data = await apiRequest('/api/properties', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(Object.fromEntries(new FormData(propertyForm))) });
                propertyMessage.textContent = data.message;
                propertyMessage.style.color = '#16804b';
                propertyMessage.classList.add('is-visible');
                propertyForm.reset();
            } catch (error) { showFormError(propertyMessage, error); }
        });
    }

    const registerForm = document.querySelector('.register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!registerForm.checkValidity()) { registerForm.reportValidity(); return; }
            const password = registerForm.querySelector('#password').value;
            const confirmation = registerForm.querySelector('#confirm-password').value;
            if (password !== confirmation) return window.alert('Passwords do not match.');
            try {
                const data = await apiRequest('/api/register', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(registerForm))) });
                const codeMessage = data.demoCode ? `${data.message}\nDemo OTP: ${data.demoCode}\nEnter the 6-digit code:` : `${data.message}\nEnter the 6-digit code you received:`;
                const code = window.prompt(codeMessage);
                if (!code) return;
                const verified = await apiRequest('/api/verify-otp', { method: 'POST', body: JSON.stringify({ challengeId: data.challengeId, code }) });
                sessionStorage.setItem('bd_aqar_token', verified.token);
                window.location.href = 'index.html';
            } catch (error) { window.alert(error.message); }
        });
    }

    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        const forgotLink = loginForm.querySelector('.password-label a');
        forgotLink?.addEventListener('click', async (event) => {
            event.preventDefault();
            const email = window.prompt('Enter the email used for your account:');
            if (!email) return;
            try {
                const reset = await apiRequest('/api/request-password-reset', { method: 'POST', body: JSON.stringify({ email }) });
                if (!reset.resetId) return window.alert(reset.message);
                const codeMessage = reset.demoCode ? `${reset.message}\nDemo OTP: ${reset.demoCode}\nEnter the 6-digit code:` : `${reset.message}\nEnter the 6-digit code you received:`;
                const code = window.prompt(codeMessage);
                if (!code) return;
                const newPassword = window.prompt('Enter your new password (at least 8 characters):');
                if (!newPassword) return;
                const result = await apiRequest('/api/reset-password', { method: 'POST', body: JSON.stringify({ resetId: reset.resetId, code, newPassword }) });
                window.alert(result.message);
            } catch (error) { window.alert(error.message); }
        });
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!loginForm.checkValidity()) { loginForm.reportValidity(); return; }
            try {
                const input = loginForm.querySelector('#login-input').value;
                const password = loginForm.querySelector('#login-password').value;
                const data = await apiRequest('/api/login', { method: 'POST', body: JSON.stringify({ login: input, password }) });
                sessionStorage.setItem('bd_aqar_token', data.token);
                window.location.href = 'index.html';
            } catch (error) { window.alert(error.message); }
        });
    }

    const dashboard = document.querySelector('.dashboard-container');
    if (dashboard) {
        const token = sessionStorage.getItem('bd_aqar_token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        Promise.all([
            apiRequest('/api/me', { headers: { Authorization: `Bearer ${token}` } }),
            apiRequest('/api/my-properties', { headers: { Authorization: `Bearer ${token}` } })
        ]).then(([profile, listingData]) => {
            const properties = listingData.properties || [];
            const stats = dashboard.querySelectorAll('.dashboard-stats .stat-card h2');
            const active = properties.filter((property) => property.status === 'Active').length;
            const pending = properties.filter((property) => property.status === 'Pending').length;
            if (stats[0]) stats[0].textContent = properties.length;
            if (stats[1]) stats[1].textContent = active;
            if (stats[2]) stats[2].textContent = pending;
            const name = profile.user.firstName || 'Seller';
            const welcome = dashboard.querySelector('.dashboard-header h1');
            if (welcome) welcome.textContent = `Welcome back, ${name}`;
            dashboard.querySelectorAll('.nav-user span').forEach((item) => { item.textContent = name; });
        }).catch(() => {
            sessionStorage.removeItem('bd_aqar_token');
            window.location.href = 'login.html';
        });
        dashboard.querySelectorAll('.logout-link').forEach((logout) => logout.addEventListener('click', () => sessionStorage.removeItem('bd_aqar_token')));
    }

    document.querySelectorAll('.property-filter').forEach((filter) => {
        filter.addEventListener('click', () => {
            document.querySelectorAll('.property-filter').forEach((item) => item.classList.remove('active'));
            filter.classList.add('active');
        });
    });

    const listingGrid = document.querySelector('.properties-grid');
    const listingSearch = document.querySelector('.property-search .search-box');
    if (listingGrid && listingSearch) {
        const cards = [...listingGrid.querySelectorAll('.property-card')];
        const resultCount = document.querySelector('.results-header > div:first-child > p:last-child');
        const locationInput = document.querySelector('#location');
        const typeSelect = document.querySelector('#property-type');
        const transactionSelect = document.querySelector('#transaction');
        const minPrice = document.querySelector('.filter-group input[placeholder="Min price"]');
        const maxPrice = document.querySelector('.filter-group input[placeholder="Max price"]');
        const query = new URLSearchParams(window.location.search);
        if (locationInput) locationInput.value = query.get('location') || '';
        if (typeSelect) typeSelect.value = query.get('type') || '';
        if (transactionSelect) transactionSelect.value = query.get('transaction') || '';
        if (minPrice) minPrice.value = query.get('min') || '';
        if (maxPrice) maxPrice.value = query.get('max') || '';
        const applyFilters = () => {
            const location = (locationInput?.value || '').toLowerCase();
            const type = (typeSelect?.value || '').toLowerCase();
            const transaction = (transactionSelect?.value || '').toLowerCase();
            const min = Number(minPrice?.value) || 0;
            const max = Number(maxPrice?.value) || Infinity;
            let visible = 0;
            cards.forEach((card) => {
                const text = card.textContent.toLowerCase();
                const price = Number((card.querySelector('.property-bottom strong')?.textContent || '').replace(/[^0-9]/g, '')) || 0;
                const matches = (!location || text.includes(location)) && (!type || text.includes(type)) && (!transaction || text.includes(transaction === 'sale' ? 'sale' : 'rent')) && price >= min && price <= max;
                card.hidden = !matches;
                if (matches) visible += 1;
            });
            if (resultCount) resultCount.textContent = `${visible} properties found`;
        };
        listingSearch.querySelector('.search-btn')?.addEventListener('click', applyFilters);
        [locationInput, typeSelect, transactionSelect, minPrice, maxPrice].forEach((field) => field?.addEventListener('change', applyFilters));
        document.querySelector('.clear-filters')?.addEventListener('click', () => {
            listingSearch.querySelectorAll('input').forEach((field) => { field.value = ''; });
            listingSearch.querySelectorAll('select').forEach((field) => { field.selectedIndex = 0; });
            document.querySelectorAll('.filter-group input').forEach((field) => { field.value = ''; });
            applyFilters();
        });
        applyFilters();
    }

    const revealItems = document.querySelectorAll('.section, .ai-section, .cta, .trust-section, .contact-section, .property-card, .location-card, .step');
    if ('IntersectionObserver' in window && revealItems.length) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12 });
        revealItems.forEach((item) => {
            item.classList.add('reveal-on-scroll');
            revealObserver.observe(item);
        });
    }

    const aiButtons = document.querySelectorAll('.ai-btn, .property-ai-btn');
    if (aiButtons.length) {
        const chat = document.createElement('aside');
        chat.className = 'bd-ai-chat';
        chat.setAttribute('aria-label', 'BD AI chat assistant');
        chat.innerHTML = `
            <div class="bd-ai-header">
                <div><strong>BD AI</strong><span>Property assistant</span></div>
                <button type="button" class="bd-ai-close" aria-label="Close BD AI">&times;</button>
            </div>
            <div class="bd-ai-messages" aria-live="polite">
                <div class="bd-ai-message assistant">Hi! I can help you find a property in Algeria. What are you looking for?</div>
            </div>
            <div class="bd-ai-suggestions">
                <button type="button">Buy a villa</button>
                <button type="button">Rent an apartment</button>
                <button type="button">Best locations</button>
            </div>
            <form class="bd-ai-form">
                <input type="text" placeholder="Ask BD AI..." aria-label="Ask BD AI" autocomplete="off" required>
                <button type="submit" aria-label="Send message">&rarr;</button>
            </form>`;
        document.body.append(chat);

        const messages = chat.querySelector('.bd-ai-messages');
        const input = chat.querySelector('input');
        const answer = (question) => {
            const text = question.toLowerCase();
            if (text.includes('rent') || text.includes('كراء') || text.includes('location')) {
                return 'For rentals, start with Apartments or Houses and filter by your Wilaya. Current examples start around 75,000 DZD/month.';
            }
            if (text.includes('buy') || text.includes('villa') || text.includes('شراء')) {
                return 'For buying, I recommend checking the verified listings in Annaba, Algiers and Constantine. You can compare price, surface and bedrooms.';
            }
            if (text.includes('location') || text.includes('where') || text.includes('wilaya') || text.includes('منطقة')) {
                return 'Annaba is a great starting point, with more options also available in Algiers, Oran, Constantine and Setif.';
            }
            if (text.includes('price') || text.includes('prix') || text.includes('سعر')) {
                return 'Prices depend on the Wilaya, surface and property type. Open Properties to use the price and surface filters.';
            }
            return 'I can help with buying, renting, prices and locations. Tell me your budget, Wilaya or preferred property type.';
        };
        const addMessage = (text, type) => {
            const message = document.createElement('div');
            message.className = `bd-ai-message ${type}`;
            message.textContent = text;
            messages.append(message);
            messages.scrollTop = messages.scrollHeight;
        };
        const submitQuestion = (question) => {
            const cleanQuestion = question.trim();
            if (!cleanQuestion) return;
            addMessage(cleanQuestion, 'user');
            input.value = '';
            window.setTimeout(() => addMessage(answer(cleanQuestion), 'assistant'), 350);
        };

        aiButtons.forEach((button) => button.addEventListener('click', () => {
            chat.classList.add('is-open');
            input.focus();
        }));
        chat.querySelector('.bd-ai-close').addEventListener('click', () => chat.classList.remove('is-open'));
        chat.querySelector('.bd-ai-form').addEventListener('submit', (event) => {
            event.preventDefault();
            submitQuestion(input.value);
        });
        chat.querySelectorAll('.bd-ai-suggestions button').forEach((button) => {
            button.addEventListener('click', () => submitQuestion(button.textContent));
        });
    }
});
