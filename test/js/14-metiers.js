// ── PROFILS MÉTIER ────────────────────────────────────────
// ══════════════════════════════════════════════════════════
// Chaque abonné choisit son métier : vocabulaire, types de matériel, listes de contrôle,
// contrat de maintenance et dossier de remise s'adaptent. Les listes restent modifiables
// dans Réglages › Métier (TH.metierPerso). Pour ajouter un métier : un objet de plus ici.
const METIERS={
  securite:{
    label:"Sécurité · vidéosurveillance · alarme",icone:"📹",video:true,
    systeme:"système de vidéosurveillance",
    contratSous:"Système de vidéosurveillance / vidéoprotection",
    contratObjet:"la maintenance préventive et corrective du système de vidéosurveillance/vidéoprotection installé chez le Client (ci-après « le Système »)",
    composants:"caméras, enregistreurs/NVR, stockage, alimentations, câblage, accès réseau et logiciels associés",
    unite:["caméra","caméras"],
    accesMateriel:"l'accès au matériel (enregistreur, caméras)",
    resumeVisite:"nettoyage, contrôle de l'enregistrement, mises à jour et tests",
    parcTypes:["Caméra","Enregistreur","Disque dur","Switch / réseau","Alarme","Domotique","Écran","Onduleur","Autre"],
    icones:{"Caméra":"📷","Enregistreur":"📼","Disque dur":"💽","Switch / réseau":"🔌","Alarme":"🚨","Domotique":"💡","Écran":"🖥️","Onduleur":"🔋"},
    catProduits:["Caméras","Enregistreurs","Réseau","Câblage","Domotique","Alarme","Main d'œuvre","Autre"],
    catVersType:{"Caméras":"Caméra","Enregistreurs":"Enregistreur","Réseau":"Switch / réseau","Alarme":"Alarme","Domotique":"Domotique"},
    check:{
      maintenance:["Nettoyage des optiques et des dômes","Contrôle de l'image jour et nuit (infrarouge)","Vérification de l'enregistrement et de la durée de conservation","Contrôle de l'état du disque dur","Mise à l'heure et mise à jour des firmwares","Test de l'accès à distance (application)","Test des détections et alertes (IA)","Contrôle des alimentations et de l'onduleur","Vérification des câbles et connectiques","Contrôle des panneaux d'information (RGPD)"],
      installation:["Pose et fixation des équipements","Raccordement et tests réseau","Paramétrage de l'enregistreur","Réglage des angles de vue et zones de détection","Configuration de l'accès à distance","Création des comptes utilisateurs","Formation du client à l'utilisation","Remise des identifiants et de la documentation","Pose des panneaux d'information (RGPD)"],
      depannage:["Diagnostic de la panne","Réparation ou remplacement","Tests de bon fonctionnement","Vérification de l'enregistrement"],
      audit:["Relevé des besoins du client","Repérage des emplacements","Vérification du réseau et des alimentations","Photos du site"]
    },
    preventif:["Vérification du bon fonctionnement des caméras et de la qualité d'image (netteté, champ de vision, horodatage) ;","Contrôle de l'enregistreur/NVR, de la capacité et de l'intégrité de stockage ;","Vérification des alimentations, connectiques, fixations et protections contre les intempéries ;","Contrôle des accès réseau, mises à jour de firmware et paramètres de sécurité ;","Nettoyage des équipements accessibles (dômes, caissons) ;","Vérification de la conformité de la signalétique et des durées de conservation des enregistrements."],
    extension:"Les extensions du Système (ajout de caméras, de canaux d'enregistrement, extension de la couverture réseau) ;",
    ex:{trans:"Mme Dupont contactée ce jour — souhaite un devis pour 2 caméras extérieures.",produit:"Caméra IP bullet 4MP",pieces:"Ex : 1 caméra dôme 4MP (remplacement)",slogan:"Vidéosurveillance · IA · Domotique",equipement:"le nom de la caméra concernée"},
    guide:null // guide vidéo intégré (application, relecture, export)
  },
  electricite:{
    label:"Électricité · bornes de recharge · photovoltaïque",icone:"⚡",
    systeme:"installation électrique",
    contratSous:"Installation électrique",
    contratObjet:"la maintenance préventive et corrective de l'installation électrique et des équipements installés chez le Client (ci-après « le Système »)",
    composants:"tableau électrique, protections, circuits, appareillages, éclairage, bornes de recharge et équipements associés",
    unite:["équipement","équipements"],
    accesMateriel:"l'accès au tableau électrique et aux équipements",
    resumeVisite:"contrôle du tableau, des protections et des équipements, essais et resserrage",
    parcTypes:["Tableau électrique","Disjoncteur / différentiel","Borne de recharge","Éclairage","Prise / appareillage","Interphone / visiophone","Chauffage électrique","Panneau photovoltaïque","Onduleur photovoltaïque","Autre"],
    icones:{"Tableau électrique":"🗄️","Disjoncteur / différentiel":"🔌","Borne de recharge":"🔋","Éclairage":"💡","Prise / appareillage":"🔌","Interphone / visiophone":"📞","Chauffage électrique":"♨️","Panneau photovoltaïque":"☀️","Onduleur photovoltaïque":"🔆"},
    catProduits:["Tableaux & protections","Appareillage","Éclairage","Câbles & conduits","Bornes de recharge","Photovoltaïque","Main d'œuvre","Autre"],
    catVersType:{"Tableaux & protections":"Tableau électrique","Éclairage":"Éclairage","Bornes de recharge":"Borne de recharge","Appareillage":"Prise / appareillage","Photovoltaïque":"Panneau photovoltaïque"},
    check:{
      maintenance:["Contrôle visuel du tableau électrique","Resserrage des connexions","Test des dispositifs différentiels","Contrôle de la mise à la terre","Vérification de l'échauffement des protections","Contrôle des éclairages et appareillages","Test de la borne de recharge","Relevé des anomalies et préconisations"],
      installation:["Pose du matériel","Raccordement au tableau","Repérage et étiquetage des circuits","Mesures et essais (isolement, terre, différentiels)","Mise sous tension et tests","Explication du fonctionnement au client","Remise du schéma et de la documentation"],
      depannage:["Diagnostic de la panne","Mise en sécurité","Réparation ou remplacement","Essais de bon fonctionnement"],
      audit:["Relevé des besoins du client","Contrôle de l'installation existante","Repérage des emplacements","Photos du site"]
    },
    preventif:["Contrôle visuel du tableau électrique et des protections ;","Resserrage des connexions accessibles ;","Essai des dispositifs différentiels et contrôle de la mise à la terre ;","Contrôle du bon fonctionnement des éclairages, appareillages et équipements raccordés ;","Contrôle des bornes de recharge et équipements spécifiques le cas échéant ;","Remise d'un compte rendu signalant les anomalies et les travaux recommandés."],
    extension:"Les extensions de l'installation (ajout de circuits, de points lumineux ou d'équipements) ;",
    ex:{trans:"M. Martin contacté ce jour — souhaite un devis pour une borne de recharge.",produit:"Disjoncteur différentiel 30 mA type A",pieces:"Ex : 1 disjoncteur 20 A (remplacement)",slogan:"Électricité · Bornes de recharge",equipement:"l'équipement concerné"},
    guide:[
      ["🗄️ Votre tableau électrique","<p>Chaque disjoncteur est repéré par une étiquette indiquant le circuit qu'il protège. En cas de coupure, repérez le disjoncteur abaissé et remontez-le. S'il saute à nouveau, débranchez les appareils de ce circuit et contactez-nous.</p>"],
      ["🔘 Tester vos différentiels","<p>Appuyez régulièrement (par exemple une fois par mois) sur le bouton « Test » de chaque interrupteur différentiel : il doit couper le courant. Remontez-le ensuite. S'il ne coupe pas, contactez-nous.</p>"],
      ["✅ Bonnes pratiques","<ul><li>Ne surchargez pas les prises multiples.</li><li>N'intervenez jamais sur l'installation sous tension.</li><li>Signalez-nous toute odeur de brûlé, tout échauffement ou crépitement.</li><li>Conservez ce dossier : il vous sera demandé en cas de vente ou de sinistre.</li></ul>"]
    ]
  },
  plomberie:{
    label:"Plomberie · chauffage · climatisation",icone:"🚿",
    systeme:"installation de plomberie, chauffage et climatisation",
    contratSous:"Plomberie · Chauffage · Climatisation",
    contratObjet:"l'entretien et la maintenance préventive et corrective des équipements de plomberie, de chauffage, de production d'eau chaude et de climatisation installés chez le Client (ci-après « le Système »)",
    composants:"chauffe-eau, chaudières, pompes à chaleur, climatiseurs, réseaux, robinetterie et équipements associés",
    unite:["équipement","équipements"],
    accesMateriel:"l'accès aux équipements (chauffe-eau, climatiseurs, chaudière)",
    resumeVisite:"nettoyage, contrôle des organes de sécurité, de l'étanchéité et des performances",
    parcTypes:["Chauffe-eau","Chauffe-eau solaire","Chaudière","Pompe à chaleur","Climatiseur","Ballon thermodynamique","Adoucisseur / filtration","Robinetterie / sanitaire","Pompe / surpresseur","Autre"],
    icones:{"Chauffe-eau":"♨️","Chauffe-eau solaire":"☀️","Chaudière":"🔥","Pompe à chaleur":"🌡️","Climatiseur":"❄️","Ballon thermodynamique":"🛢️","Adoucisseur / filtration":"💧","Robinetterie / sanitaire":"🚰","Pompe / surpresseur":"⚙️"},
    catProduits:["Chauffe-eau","Climatisation","Chauffage","Sanitaire & robinetterie","Tuyauterie & raccords","Pièces détachées","Main d'œuvre","Autre"],
    catVersType:{"Chauffe-eau":"Chauffe-eau","Climatisation":"Climatiseur","Chauffage":"Chaudière","Sanitaire & robinetterie":"Robinetterie / sanitaire"},
    check:{
      maintenance:["Contrôle de l'étanchéité des raccords","Nettoyage des filtres (climatisation)","Contrôle de la pression et des organes de sécurité","Vérification du groupe de sécurité du chauffe-eau","Détartrage si nécessaire","Contrôle des évacuations et des condensats","Mesure des températures de fonctionnement","Relevé des anomalies et préconisations"],
      installation:["Pose et fixation des équipements","Raccordements hydrauliques","Raccordements électriques","Mise en eau et purge","Test d'étanchéité","Mise en service et réglages","Explication du fonctionnement au client","Remise des notices et garanties"],
      depannage:["Diagnostic de la panne","Mise en sécurité (coupure eau / électricité)","Réparation ou remplacement","Tests de bon fonctionnement et d'étanchéité"],
      audit:["Relevé des besoins du client","Contrôle de l'installation existante","Repérage des emplacements","Photos du site"]
    },
    preventif:["Nettoyage et contrôle des équipements (filtres, échangeurs, unités intérieures et extérieures) ;","Contrôle des organes de sécurité, de la pression et de l'étanchéité ;","Vérification des évacuations et de l'écoulement des condensats ;","Contrôle des performances de fonctionnement (températures, débit) ;","Détartrage des équipements lorsque nécessaire ;","Remise d'un compte rendu signalant les anomalies et les travaux recommandés."],
    extension:"Les extensions de l'installation (ajout d'équipements, de points d'eau ou de réseaux) ;",
    ex:{trans:"Mme Dupont contactée ce jour — souhaite un devis pour un climatiseur dans la chambre.",produit:"Climatiseur mural 9000 BTU",pieces:"Ex : 1 groupe de sécurité (remplacement)",slogan:"Plomberie · Climatisation",equipement:"l'équipement concerné"},
    guide:[
      ["💧 En cas de fuite","<p>Fermez immédiatement le robinet d'arrêt général (repérez-le dès aujourd'hui), coupez l'alimentation électrique des appareils concernés, puis contactez-nous.</p>"],
      ["♨️ Votre chauffe-eau","<p>Manœuvrez régulièrement le groupe de sécurité (par exemple une fois par mois) pour éviter son entartrage. Un léger écoulement pendant la chauffe est normal ; un écoulement permanent ne l'est pas.</p>"],
      ["❄️ Votre climatisation","<p>Nettoyez régulièrement les filtres de l'unité intérieure, laissez dégagée l'unité extérieure et faites entretenir l'appareil au moins une fois par an.</p>"],
      ["✅ Bonnes pratiques","<ul><li>Ne bouchez pas les évacuations et les grilles d'aération.</li><li>Signalez-nous tout bruit anormal, odeur ou baisse de performance.</li><li>Conservez les notices et ce dossier : ils sont demandés en cas de garantie.</li></ul>"]
    ]
  },
  batiment:{
    label:"Bâtiment · maçonnerie · menuiserie · peinture",icone:"🧱",
    systeme:"ouvrage",
    contratSous:"Entretien des ouvrages",
    contratObjet:"l'entretien et la maintenance préventive et corrective des ouvrages et éléments réalisés ou posés par le Prestataire chez le Client (ci-après « le Système »)",
    composants:"menuiseries, fermetures, revêtements, toitures, étanchéités et autres ouvrages réalisés",
    unite:["élément","éléments"],
    accesMateriel:"l'accès aux ouvrages concernés",
    resumeVisite:"contrôle visuel, réglages, graissage et repérage des désordres",
    parcTypes:["Menuiserie (porte, fenêtre)","Volet / store","Portail / clôture","Toiture / étanchéité","Charpente","Revêtement de sol","Peinture / enduit","Cloison / plafond","Maçonnerie","Autre"],
    icones:{"Menuiserie (porte, fenêtre)":"🚪","Volet / store":"🪟","Portail / clôture":"🚧","Toiture / étanchéité":"🏠","Charpente":"🪵","Revêtement de sol":"🟫","Peinture / enduit":"🎨","Cloison / plafond":"📐","Maçonnerie":"🧱"},
    catProduits:["Gros œuvre","Menuiserie","Couverture & étanchéité","Revêtements","Peinture","Fournitures","Main d'œuvre","Autre"],
    catVersType:{"Menuiserie":"Menuiserie (porte, fenêtre)","Couverture & étanchéité":"Toiture / étanchéité","Revêtements":"Revêtement de sol","Peinture":"Peinture / enduit","Gros œuvre":"Maçonnerie"},
    check:{
      maintenance:["Contrôle visuel des ouvrages","Vérification des menuiseries et quincailleries","Contrôle des joints et de l'étanchéité","Repérage des fissures et infiltrations","Nettoyage et graissage des mécanismes","Relevé des désordres et préconisations"],
      installation:["Protection du chantier et des existants","Réalisation des ouvrages selon le devis","Nettoyage et évacuation des déchets","Contrôle des finitions","Visite de réception avec le client","Levée des réserves éventuelles","Remise des notices d'entretien"],
      depannage:["Constat du désordre","Mise en sécurité","Réparation","Contrôle après réparation"],
      audit:["Relevé des besoins du client","Prise de mesures","Contrôle de l'existant","Photos du site"]
    },
    preventif:["Contrôle visuel des ouvrages réalisés ;","Vérification et réglage des menuiseries, fermetures et quincailleries ;","Contrôle des joints, de l'étanchéité et des évacuations ;","Repérage des fissures, infiltrations et autres désordres ;","Nettoyage et graissage des mécanismes accessibles ;","Remise d'un compte rendu signalant les anomalies et les travaux recommandés."],
    extension:"Les travaux neufs ou de modification des ouvrages existants ;",
    ex:{trans:"M. Martin contacté ce jour — souhaite un devis pour remplacer 3 fenêtres.",produit:"Fenêtre aluminium 2 vantaux 120 x 135",pieces:"Ex : 1 poignée de fenêtre (remplacement)",slogan:"Construction · Rénovation",equipement:"l'ouvrage concerné"},
    guide:[
      ["🧽 Entretenir vos ouvrages","<p>Suivez les notices d'entretien remises avec ce dossier. Nettoyez les menuiseries avec des produits doux, sans abrasif, et dégagez régulièrement les rails et les trous d'évacuation.</p>"],
      ["🛡️ Vos garanties légales","<ul><li><strong>Garantie de parfait achèvement</strong> : 1 an après la réception, pour les désordres signalés.</li><li><strong>Garantie biennale</strong> (bon fonctionnement) : 2 ans pour les éléments d'équipement dissociables.</li><li><strong>Garantie décennale</strong> : 10 ans pour les dommages qui compromettent la solidité de l'ouvrage ou le rendent impropre à sa destination.</li></ul><p>Signalez tout désordre par écrit, avec des photos, dès que vous le constatez.</p>"],
      ["✅ Bonnes pratiques","<ul><li>Ne percez pas les zones d'étanchéité sans avis.</li><li>Surveillez l'apparition de fissures ou de traces d'humidité.</li><li>Conservez ce dossier et le procès-verbal de réception.</li></ul>"]
    ]
  },
  services:{
    label:"Services · nettoyage · espaces verts · piscine",icone:"🌿",
    systeme:"site",
    contratSous:"Contrat d'entretien",
    contratObjet:"l'entretien régulier du site du Client (espaces verts, piscine, locaux ou équipements désignés en Annexe 1) (ci-après « le Système »)",
    composants:"espaces, surfaces, piscine, équipements et matériels confiés",
    unite:["passage mensuel","passages mensuels"],
    accesMateriel:"l'accès au site et aux équipements",
    resumeVisite:"réalisation des prestations prévues et contrôle des équipements",
    parcTypes:["Piscine","Pompe / filtration","Robot de piscine","Espace vert","Arrosage automatique","Local / surface","Matériel confié","Autre"],
    icones:{"Piscine":"🏊","Pompe / filtration":"⚙️","Robot de piscine":"🤖","Espace vert":"🌳","Arrosage automatique":"💦","Local / surface":"🏢","Matériel confié":"🧰"},
    catProduits:["Entretien courant","Espaces verts","Piscine","Nettoyage","Produits & fournitures","Main d'œuvre","Autre"],
    catVersType:{"Piscine":"Piscine","Espaces verts":"Espace vert"},
    check:{
      maintenance:["Contrôle de l'état général du site","Réalisation des prestations prévues","Contrôle des équipements (pompe, filtration, arrosage)","Mesures et réglages (ex. pH et chlore d'une piscine)","Évacuation des déchets","Photos avant / après","Relevé des anomalies et préconisations"],
      installation:["Visite initiale du site","Définition des prestations et de la fréquence","Remise des accès (clés, codes)","Première prestation","Validation avec le client"],
      depannage:["Constat du problème","Intervention","Contrôle après intervention"],
      audit:["Relevé des besoins du client","Mesure des surfaces","Repérage des accès","Photos du site"]
    },
    preventif:["Réalisation des prestations d'entretien selon la fréquence définie en Annexe 2 ;","Contrôle du bon fonctionnement des équipements confiés ;","Mesures et réglages nécessaires (traitement de l'eau, arrosage…) ;","Évacuation des déchets issus des prestations ;","Information du Client de toute anomalie constatée."],
    extension:"Les prestations ponctuelles ou supplémentaires non prévues en Annexe 2 ;",
    ex:{trans:"Mme Dupont contactée ce jour — souhaite un entretien de piscine hebdomadaire.",produit:"Entretien piscine — passage hebdomadaire",pieces:"Ex : 1 cartouche de filtre (remplacement)",slogan:"Entretien · Espaces verts · Piscine",equipement:"l'équipement concerné"},
    guide:[
      ["📅 Vos passages","<p>Les dates de passage sont fixées avec vous et rappelées par e-mail. Prévenez-nous si l'accès au site est impossible à une date prévue.</p>"],
      ["✅ Bonnes pratiques","<ul><li>Signalez-nous tout changement sur le site (travaux, nouvel équipement, accès modifié).</li><li>Ne modifiez pas les réglages des équipements (filtration, arrosage) sans nous en parler.</li><li>Conservez ce dossier : il récapitule le matériel suivi et nos coordonnées.</li></ul>"]
    ]
  },
  generique:{
    label:"Autre métier",icone:"🧰",
    systeme:"installation",
    contratSous:"Contrat de maintenance",
    contratObjet:"la maintenance préventive et corrective des équipements installés chez le Client (ci-après « le Système »)",
    composants:"équipements, accessoires et éléments installés",
    unite:["équipement","équipements"],
    accesMateriel:"l'accès aux équipements",
    resumeVisite:"contrôle, nettoyage et tests des équipements",
    parcTypes:["Équipement","Accessoire","Pièce détachée","Autre"],
    icones:{"Équipement":"⚙️","Accessoire":"🔩","Pièce détachée":"🧩"},
    catProduits:["Matériel","Fournitures","Main d'œuvre","Autre"],
    catVersType:{"Matériel":"Équipement"},
    check:{
      maintenance:["Contrôle de l'état général","Nettoyage","Tests de bon fonctionnement","Relevé des anomalies et préconisations"],
      installation:["Pose et fixation","Raccordements","Mise en service et tests","Explication du fonctionnement au client","Remise de la documentation"],
      depannage:["Diagnostic de la panne","Réparation ou remplacement","Tests de bon fonctionnement"],
      audit:["Relevé des besoins du client","Contrôle de l'existant","Photos du site"]
    },
    preventif:["Contrôle de l'état général et du bon fonctionnement des équipements ;","Nettoyage des équipements accessibles ;","Tests et réglages nécessaires ;","Remise d'un compte rendu signalant les anomalies et les travaux recommandés."],
    extension:"Les extensions de l'installation (ajout d'équipements) ;",
    ex:{trans:"M. Martin contacté ce jour — souhaite un devis.",produit:"Désignation du produit",pieces:"Ex : 1 pièce (remplacement)",slogan:"Votre accroche",equipement:"l'équipement concerné"},
    guide:[
      ["✅ Bonnes pratiques","<ul><li>Suivez les notices d'utilisation et d'entretien remises avec ce dossier.</li><li>Signalez-nous tout dysfonctionnement dès que vous le constatez.</li><li>Conservez ce dossier : les numéros de série sont demandés en cas de garantie.</li></ul>"]
    ]
  }
};
const METIER_ORDRE=["securite","electricite","plomberie","batiment","services","generique"];

// Vocabulaire de la fiche client, des rapports et du contrat selon le métier.
// Les valeurs par défaut sont celles d'AD Secure (sécurité) : ne pas les modifier.
const FICHE_DEF={
  parc:"Parc installé",parcIcone:"📦",parcSub:"équipement(s) en place",parcUnite:"Équipement",
  parcVide:"Aucun équipement enregistré.<br/>Ajoutez-les un par un ou importez-les depuis une facture.",
  importFacture:true,remise:true,remiseLbl:"Dossier de remise",
  interventions:"Interventions",riSection:"Rapports d'intervention",riBtn:"Rapport d'intervention",riVide:"Aucune intervention enregistrée.",
  contrat:"Contrat de maintenance",riUnite:"rapport(s)",
  visite:"visite de maintenance",visitesPl:"Visites de maintenance",prestation:"la maintenance de votre installation",
  contrats:"Contrats de maintenance",recurrent:"Maintenance récurrente",
  clauseVisites:", dont les visites préventives semestrielles",equipe:"notre technicien",visitePrev:"la visite préventive",parcDate:"Date d'installation",intervenant:"Technicien(s)",
  riTypes:{maintenance:"Maintenance préventive",installation:"Installation / mise en service",depannage:"Dépannage / SAV",audit:"Visite technique / audit"}
};
const FICHE_METIER={
  plomberie:{contrat:"Contrat d'entretien",contrats:"Contrats d'entretien",recurrent:"Entretien récurrent",visite:"visite d'entretien",visitesPl:"Visites d'entretien",prestation:"l'entretien de vos équipements",
    riTypes:{maintenance:"Entretien annuel",installation:"Installation / mise en service",depannage:"Dépannage / SAV",audit:"Visite technique / devis"}},
  batiment:{parc:"Ouvrages réalisés",parcIcone:"🧱",parcSub:"ouvrage(s) réalisé(s)",parcUnite:"Ouvrage",
    parcVide:"Aucun ouvrage enregistré.<br/>Ajoutez-les un par un ou importez-les depuis une facture.",
    remiseLbl:"Dossier de fin de chantier",contrat:"Contrat d'entretien",contrats:"Contrats d'entretien",recurrent:"Entretien récurrent",parcDate:"Date de réalisation",visite:"visite d'entretien",visitesPl:"Visites d'entretien",prestation:"l'entretien de vos ouvrages",
    riSection:"Rapports de chantier",riBtn:"Rapport de chantier",
    riTypes:{maintenance:"Entretien",installation:"Chantier / réception des travaux",depannage:"Reprise / SAV",audit:"Visite / métré"}},
  services:{parc:"Équipements suivis",parcIcone:"🧰",parcSub:"équipement(s) suivi(s)",parcUnite:"Équipement",
    parcVide:"Aucun équipement suivi.<br/>Ajoutez ceux que vous entretenez chez ce client (piscine, pompe, arrosage, matériel confié…).",
    importFacture:false,remise:false,contrat:"Contrat d'entretien",contrats:"Contrats d'entretien",recurrent:"Entretien récurrent",parcDate:"Suivi depuis le",intervenant:"Intervenant(s)",
    clauseVisites:", selon la fréquence de passage convenue",equipe:"notre équipe",visitePrev:"l'entretien",visite:"passage d'entretien",visitesPl:"Passages d'entretien",prestation:"l'entretien de votre site",
    interventions:"Passages",riUnite:"passage(s)",riSection:"Comptes rendus de passage",riBtn:"Compte rendu de passage",riVide:"Aucun passage enregistré.",
    riTypes:{maintenance:"Passage d'entretien",installation:"Mise en place / premier passage",depannage:"Intervention ponctuelle",audit:"Visite / estimation"}}
};
function FV(k){ const f=FICHE_METIER[metierId()]||{}; return f[k]!==undefined?f[k]:FICHE_DEF[k]; }

// Profil actif = profil du métier + personnalisations de l'abonné
function metierId(){ return METIERS[TH&&TH.metier]?TH.metier:"generique"; }
function MP(){
  const base=METIERS[metierId()];
  const perso=(TH&&TH.metierPerso)||{};
  const p=Object.assign({},base);
  if(Array.isArray(perso.parcTypes)&&perso.parcTypes.length) p.parcTypes=perso.parcTypes;
  p.check=Object.assign({},base.check);
  if(Array.isArray(perso.checkMaintenance)&&perso.checkMaintenance.length) p.check.maintenance=perso.checkMaintenance;
  if(Array.isArray(perso.checkInstallation)&&perso.checkInstallation.length) p.check.installation=perso.checkInstallation;
  if(Array.isArray(perso.unite)&&perso.unite[0]) p.unite=[perso.unite[0],perso.unite[1]||perso.unite[0]+"s"];
  return p;
}
function uniteTxt(n){ const u=MP().unite; return n>1?u[1]:u[0]; }

// Recalcule les listes de l'appli (types de matériel, listes de contrôle) d'après le métier
function appliquerMetier(){
  try{
    const p=MP();
    PARC_TYPES=p.parcTypes.includes("Autre")?p.parcTypes.slice():p.parcTypes.concat(["Autre"]);
    PARC_ICON=Object.assign({"Autre":"🔧"},p.icones);
    PARC_CAT_TYPE=Object.assign({},p.catVersType);
    Object.keys(RI_CHECK).forEach(k=>delete RI_CHECK[k]);
    Object.assign(RI_CHECK,JSON.parse(JSON.stringify(p.check)));
    if(typeof RI_TYPES!=="undefined") Object.assign(RI_TYPES,FV("riTypes"));
    // Lu par le serveur pour les e-mails de relance (reconduction, rappel de visite)
    TH.systemeLibelle=p.systeme;
    TH.accesMateriel=p.accesMateriel;
    TH.contratLibelle=FV("contrat").toLowerCase();
    TH.visiteLibelle=FV("visite");
    TH.contratPrestation=FV("prestation");
    TH.contratClauseVisites=FV("clauseVisites");
    TH.equipeLibelle=FV("equipe");
    TH.visitePrev=FV("visitePrev");
    // Catégories du catalogue encore celles de la sécurité (nouvel abonné d'un autre métier) → celles du métier
    if(metierId()!=="securite"&&JSON.stringify(CAT_PRODUITS)===JSON.stringify(METIERS.securite.catProduits)) CAT_PRODUITS=p.catProduits.slice();
  }catch(e){ console.warn("appliquerMetier:",e); }
}

// Catalogue d'exemple (vidéosurveillance) encore intact ?
function catalogueDemo(){ return CATALOGUE.length>0&&CATALOGUE.every(x=>/^cat\d+$/.test(x.id||"")); }

function choisirMetier(id,depuisAccueil){
  if(!METIERS[id]) return;
  const change=TH.metier!==id;
  TH.metier=id;
  if(change) TH.metierPerso={};
  if(catalogueDemo()&&id!=="securite"){ CATALOGUE=[]; }
  if(change&&(depuisAccueil||catalogueDemo()||!CATALOGUE.length)) CAT_PRODUITS=METIERS[id].catProduits.slice();
  appliquerMetier();
  logActivity("Métier",METIERS[id].label);
  saveData();
  closeModal();
  if(activePanel==="metier") renderPanel();
  renderPage();
}
window.choisirMetier=choisirMetier;

// Premier lancement d'un nouvel abonné : choix du métier (administrateurs)
function verifierMetier(){
  if(!currentUser||TH.metier||!hasRole("admin")) return;
  const cartes=METIER_ORDRE.map(id=>{const m=METIERS[id];return `<button onclick="choisirMetier('${id}',true)" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 14px;margin-bottom:8px;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;font-size:14px;font-weight:600;color:#0f172a;font-family:inherit"><span style="font-size:24px">${m.icone}</span><span>${pE(m.label)}</span></button>`;}).join("");
  showModal("Bienvenue ! Quel est votre métier ?",`
    <p style="font-size:13px;color:#475569;margin:0 0 14px">AD Management adapte le vocabulaire, les types de matériel, les listes de contrôle, le contrat de maintenance et le dossier de remise à votre activité. Vous pourrez changer ce choix et ajuster les listes dans Réglages › Métier.</p>
    ${cartes}`,
    `<button class="btn-cancel" onclick="choisirMetier('generique',true)">Passer</button>`);
}

// Réglages › Métier : choix du profil + listes personnalisables (une ligne par élément)
function renderMetierPanel(){
  const p=MP(), id=metierId();
  const zone=(cle,titre,liste,aide)=>`<div class="p-field"><label class="field-label">${titre}</label><textarea id="mp-${cle}" style="min-height:130px;width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;padding:9px;border-radius:9px;border:1.5px solid #e2e8f0">${pE(liste.join("\n"))}</textarea><div style="font-size:11px;color:#94a3b8;margin-top:4px">${aide}</div></div>`;
  return panelShell("🧰","Métier",`
    ${reglageTitre("Votre métier","Adapte le vocabulaire, le matériel, les listes de contrôle, les contrats et le dossier de remise")}
    <div class="p-field"><select id="mp-metier" onchange="if(confirm('Changer de métier ? Les listes ci-dessous reviendront aux valeurs du nouveau métier. Vos clients, devis et factures ne changent pas.'))choisirMetier(this.value);else this.value='${id}'">
      ${METIER_ORDRE.map(k=>`<option value="${k}" ${k===id?"selected":""}>${METIERS[k].icone} ${pE(METIERS[k].label)}</option>`).join("")}</select></div>
    ${reglageTitre("Personnaliser","Une ligne par élément. Laissez vide pour revenir aux valeurs du métier.")}
    ${zone("parc",MP().video?"Types de matériel suivis":"Types d'éléments suivis",p.parcTypes,"Utilisés dans la rubrique « "+FV("parc")+" » de chaque client")}
    ${zone("maint","Liste de contrôle — "+RI_TYPES.maintenance.toLowerCase(),p.check.maintenance,"Proposée dans chaque rapport « "+RI_TYPES.maintenance+" »")}
    ${zone("inst","Liste de contrôle — "+RI_TYPES.installation.toLowerCase(),p.check.installation,"Proposée dans chaque rapport « "+RI_TYPES.installation+" »")}
    <div class="field-row"><div class="p-field"><label class="field-label">Unité des forfaits (singulier)</label><input id="mp-u1" value="${pE(p.unite[0])}"/></div>
    <div class="p-field"><label class="field-label">Unité (pluriel)</label><input id="mp-u2" value="${pE(p.unite[1])}"/></div></div>`,
    `<button class="btn-reset" onclick="closePanel();openPanel('settings')">← Réglages</button><button class="btn-apply" onclick="enregistrerMetierPerso()">Enregistrer ✓</button>`);
}
function enregistrerMetierPerso(){
  const lignes=id=>(document.getElementById(id).value||"").split("\n").map(s=>s.trim()).filter(Boolean);
  const base=METIERS[metierId()];
  const diff=(a,b)=>JSON.stringify(a)!==JSON.stringify(b);
  const parc=lignes("mp-parc"),maint=lignes("mp-maint"),inst=lignes("mp-inst");
  const u=[document.getElementById("mp-u1").value.trim(),document.getElementById("mp-u2").value.trim()];
  TH.metierPerso={
    parcTypes:parc.length&&diff(parc,base.parcTypes)?parc:undefined,
    checkMaintenance:maint.length&&diff(maint,base.check.maintenance)?maint:undefined,
    checkInstallation:inst.length&&diff(inst,base.check.installation)?inst:undefined,
    unite:u[0]&&diff(u,base.unite)?u:undefined
  };
  appliquerMetier();
  logActivity("Métier","Listes personnalisées enregistrées");
  saveData();
  closePanel();
  alert("✓ Réglages du métier enregistrés.");
}
window.enregistrerMetierPerso=enregistrerMetierPerso;

// ══════════════════════════════════════════════════════════
