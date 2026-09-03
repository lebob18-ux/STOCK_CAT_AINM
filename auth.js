// --- 1. CONFIGURATION SUPABASE SÉCURISÉE (ANTI-DOUBLON GLOBAL)23h42 ---
if (typeof window.SUPABASE_URL === 'undefined') {
const SUPABASE_URL = "https://thbqkeugjvsxbryfnzuo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2-Ij-nrTPeK6rB-kSD-QTg_b42zNakq";
}

if (typeof window.supabaseClientAuth === 'undefined' && window.supabase) {
    window.supabaseClientAuth = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

// --- 2. VÉRIFICATION AUTOMATIQUE AU CHARGEMENT ---
document.addEventListener("DOMContentLoaded", async () => {
    if (!window.supabaseClientAuth) {
        console.error("Erreur critique : La bibliothèque Supabase n'est pas initialisée.");
        return;
    }
    await verifierAcces();
});

async function verifierAcces() {
    const savedEmail = localStorage.getItem('user_email_app');
    const overlay = document.getElementById('auth-overlay');
    const formDemande = document.getElementById('form-demande');
    const attenteValidation = document.getElementById('attente-validation');

    if (!savedEmail) {
        afficherFormulaire(overlay, formDemande, attenteValidation);
        return;
    }

    try {
        const { data, error } = await window.supabaseClientAuth
            .from('utilisateurs_K1')
            .select('valide')
            .eq('email', savedEmail)
            .single();

        if (error || !data) {
            localStorage.removeItem('user_email_app');
            afficherFormulaire(overlay, formDemande, attenteValidation);
            return;
        }

        if (data.valide === true) {
            if (overlay) overlay.style.display = 'none';
        } else {
            afficherAttente(overlay, formDemande, attenteValidation);
        }
    } catch (err) {
        console.error("Erreur lors de la vérification de l'accès :", err);
    }
}

// --- 3. ENREGISTREMENT SÉCURISÉ DE LA DEMANDE ---
async function envoyerDemandeAcces() {
    const prenomInput = document.getElementById('req-prenom');
    const nomInput = document.getElementById('req-nom');
    const emailInput = document.getElementById('req-email');

    if (!prenomInput || !nomInput || !emailInput) {
        alert("Champs du formulaire introuvables dans le HTML.");
        return;
    }

    const prenom = prenomInput.value.trim();
    const nom = nomInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();

    if (!prenom || !nom || !email) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Veuillez saisir une adresse e-mail valide.");
        return;
    }

    try {
        const { error } = await window.supabaseClientAuth
            .from('utilisateurs_K1')
            .insert([{ 
                prenom: prenom, 
                nom: nom, 
                email: email, 
                valide: false 
            }]);

        if (error) {
            if (error.code === '23505') {
                alert("Cet e-mail a déjà fait l'objet d'une demande d'accès.");
            } else {
                alert("Erreur lors de l'enregistrement : " + error.message);
            }
        } else {
            localStorage.setItem('user_email_app', email);
            
            const overlay = document.getElementById('auth-overlay');
            const formDemande = document.getElementById('form-demande');
            const attenteValidation = document.getElementById('attente-validation');
            afficherAttente(overlay, formDemande, attenteValidation);
        }
    } catch (err) {
        alert("Une erreur technique est survenue.");
        console.error(err);
    }
}

// --- 4. FONCTIONS UTILITAIRES D'AFFICHAGE ---
function afficherFormulaire(overlay, form, attente) {
    if (overlay) overlay.style.display = 'flex';
    if (form) form.style.display = 'block';
    if (attente) attente.style.display = 'none';
}

function afficherAttente(overlay, form, attente) {
    if (overlay) overlay.style.display = 'flex';
    if (form) form.style.display = 'none';
    if (attente) attente.style.display = 'block';
}
