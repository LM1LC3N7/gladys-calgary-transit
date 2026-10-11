# Calgary Transit

Les **prochains passages** de Calgary Transit (autobus et CTrain) en temps
réel et l'**état des lignes du CTrain** près de chez vous, dans Gladys.

Cette intégration n'est pas affiliée à Calgary Transit ni à la Ville de
Calgary.

## Démarrer en 3 étapes

Aucune connaissance technique n'est nécessaire, et aucun compte : il n'y a
**rien à créer, aucune clé**.

1. **Vérifiez l'adresse de votre maison dans Gladys** : _Paramètres →
   Maisons_. La maison doit avoir une position sur la carte. L'intégration s'en
   sert pour trouver les arrêts proches de chez vous. La position reste dans
   votre Gladys.
2. **Installez l'intégration** depuis le catalogue des intégrations, et
   acceptez l'accès à la position de la maison. Ouvrez sa page de
   configuration et cliquez sur **Enregistrer**, sans rien remplir.
3. Ouvrez l'onglet **Découverte** de l'intégration. Les 3 arrêts les plus
   proches de chez vous y sont proposés, avec leur nom et la direction des
   lignes, par exemple « Calgary Transit – NB 1 ST SW @ 8 AV SW (22 →
   Richmond Rd SW, 66 → Lakeview) », ainsi que l'appareil **Calgary Transit –
   CTrain**. Cliquez sur **Ajouter** pour chacun de ceux qui vous intéressent.

C'est tout. Vous avez maintenant les **prochains passages** de chaque arrêt
et l'état des lignes du CTrain.

Le message en haut de la page de configuration indique toujours la prochaine
chose à faire. Par exemple : « Prêt : 3 arrêts et les lignes à ajouter.
Ouvrez l'onglet Découverte… ».

Les noms des appareils commencent par **Calgary Transit –**, pour les
retrouver d'un coup d'œil dans la liste des appareils de Gladys. Vous pouvez
les renommer librement dans Gladys.

### Afficher les passages sur le tableau de bord

1. Ouvrez le tableau de bord, puis cliquez sur **Modifier**.
2. Ajoutez un widget et choisissez **Passages Calgary Transit**.
3. Choisissez l'arrêt, puis enregistrez.

Le widget **État du CTrain** s'ajoute de la même façon.

## D'où viennent les passages

Calgary Transit publie ses prédictions en temps réel en accès libre, pour les
autobus et le CTrain : l'intégration les lit chaque minute, pour tous vos
arrêts d'un coup. La direction de chaque passage (« → Richmond Rd SW »)
vient de Transitous, un service communautaire gratuit.

Une station du CTrain a un arrêt par quai, un par sens : « EB City Hall/Bow
Valley College » (vers l'est) et « WB City Hall/Bow Valley College » (vers
l'ouest).

## Suivre d'autres arrêts (travail, école…)

Pour un arrêt loin de chez vous :

1. En bas de la page de configuration, cliquez sur **Chercher un arrêt**.
   Tapez une rue, une station ou le numéro de l'arrêt, par exemple « City
   Hall » ou « 1 St SW 8 Av ».
2. La réponse liste les arrêts avec leur numéro et la direction de leurs
   lignes, par exemple `5299 — NB 1 ST SW @ 8 AV SW (22 → Richmond Rd SW, 66
→ Lakeview)`.
3. Copiez le numéro (`5299`) dans **Arrêts**, enregistrez, puis ajoutez
   l'arrêt dans l'onglet **Découverte**.

Le numéro est celui écrit sur chaque panneau d'arrêt de Calgary Transit
(celui qu'on envoie par texto au 74500).

### Pour aller plus loin

Le champ **Arrêts** accepte plusieurs numéros séparés par des virgules, un
filtre de ligne après `@` et un nom après `:`.

| Saisie                   | Signification                                |
| ------------------------ | -------------------------------------------- |
| `5299`                   | toutes les lignes qui passent à l'arrêt 5299 |
| `5299@22`                | la ligne 22 seulement                        |
| `5299@22\|66`            | les lignes 22 et 66                          |
| `5299@22:Bus du travail` | la ligne 22, affichée « Bus du travail »     |
| `6831@202`               | la ligne bleue à City Hall, vers l'est       |

## Ce que contient chaque appareil

**Arrêt :**

- **Prochain passage**, **Passage 2**… : les minutes d'attente. 999 signifie
  qu'aucun passage n'est prévu.
- **Ligne du prochain passage**… : la ligne (« 22 », « 201 » pour la ligne
  rouge, « 202 » pour la ligne bleue).
- **Prochains passages** : un résumé, par exemple `22 3 min · 66 11 min`.

**CTrain :** pour chaque ligne (rouge, bleue), un **état** (`Normal`,
`Perturbé`, `Avis` ou `Inconnu`) et le **message** de l'alerte de Calgary
Transit. Une fermeture entre deux stations, avec des navettes d'autobus, est
une perturbation ; un détour ou toute autre annonce est un avis. Les
ascenseurs, les escaliers mécaniques et les alertes sur une seule station ne
changent pas l'état d'une ligne.

## Scènes

**Déclencheurs :**

- **Passage imminent** : un passage passe sous 1, 2, 3, 5, 10 ou 15 minutes.
  Exemple : « quand le 22 est à 5 minutes, allumer la lumière de l'entrée ».
- **État d'une ligne modifié** : une ligne est perturbée, revient à la
  normale, ou reçoit un avis. Exemple : « si la ligne rouge est perturbée,
  m'envoyer un message ».

**Actions :**

- **Lire les prochains passages** : par exemple un message chaque matin
  « Votre 22 passe dans {{minutes}} minutes ».
- **Lire l'état d'une ligne** : renvoie l'état, le message de Calgary Transit
  et `normal` (vrai ou faux).

## En cas de problème

| Message ou symptôme                                              | Que faire                                                                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| « renseignez l'adresse de votre maison »                         | _Paramètres → Maisons_ : placez la maison sur la carte, puis enregistrez de nouveau la configuration.    |
| « Gladys n'a pas partagé la position de votre maison »           | Réinstallez l'intégration et acceptez l'accès à la position, ou tapez des numéros d'arrêts.              |
| Rien dans l'onglet Découverte                                    | Lisez le message de la page de configuration : il dit ce qui manque.                                     |
| « L'arrêt … n'est pas dans la liste des arrêts Calgary Transit » | Vérifiez le numéro sur le panneau. Un arrêt tout neuf arrive avec la prochaine version de l'intégration. |
| Un arrêt reste à 999                                             | Aucun passage prévu (la nuit), ou un filtre de ligne qui ne correspond à aucune ligne de l'arrêt.        |
| Un passage n'a pas de direction                                  | Transitous ne connaissait pas encore ce trajet : la direction revient dans la journée.                   |

## Vie privée, données et licences

- La position de la maison sert seulement à chercher les arrêts proches, dans
  la liste d'arrêts livrée avec l'intégration : elle n'est envoyée nulle part.
- Liste des arrêts, temps réel et alertes : données de Calgary Transit, données
  ouvertes de la Ville de Calgary, sous la
  [Open Government Licence – City of Calgary](https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa)
  (la liste des arrêts est mise à jour à chaque version).
- Directions : [Transitous](https://transitous.org/sources/), un service
  communautaire gratuit, à partir des données de Calgary Transit.
- Code de l'intégration : licence Apache 2.0.
