---
title: "Angular : Comment faire un composant interactif comme les pros ?"
description: "Utilisez le plein potentiel des formulaires Angular avec l'interface <code>ControlValueAccessor</code>."
date: "08/09/2025"
---

## Introduction

> ⚠️ Cet article nécessite d'être familier avec Angular. C'est une bonne idée de connaitre les notions de [FormGroup](https://angular.dev/api/forms/FormGroup#description), [FormControl](https://angular.dev/api/forms/FormControl#description) et l'attribut [\[(ngModel)\]](https://angular.dev/api/forms/NgModel#description) avant de lire la suite !  

Créer un champ de formulaire personnalisé peut s’avérer nécessaire dans de nombreuses situations ; que ce soit parce que le composant n'existe pas nativement, n'est pas dans votre bibliothèque de composants ou encore pour gagner plus de contrôle sur le comportement de votre application, il est très probable qu’un développeur Angular soit un jour confronté à ce problème.

Heureusement, Angular met à disposition deux API robustes pour gérer les formulaires : les **Forms** et les **ReactiveForms**. Dans cet article, nous allons voir ensemble comment créer un composant compatible avec l’écosysteme d’Angular, en respectant les conventions attendues par ces deux API.

En implémentant un input de cette manière on s’assure :

- Une syntaxe identique aux composants HTML natifs sur Angular
- La compatibilité avec les API de gestion de formulaires (Forms & ReactiveForms)
- La possibilité d’ajouter, au besoin, de la validation, des états (`disabled`, `touched`, `invalid`, etc.) et d'autres comportements liés aux formulaires
- Un composant réutilisable, prévisible et facile à maintenir

> Afin de simplifier la lecture, tous les imports ont été volontairement omis dans les extraits de code.
> Cet article a été écrit sous Angular 20, mais les concepts abordés devraient être valables pour toutes les versions récentes d'Angular.
> Le code source de cet article est disponible en son intégralité [ici](https://github.com/evanlaj/angular-examples).

## Exemple 1 : Le composant `star-rating`

Commençons directement avec un premier composant. Dans cette première partie, on va construire un **composant d’input personnalisé très simple**, pour se familiariser avec :

- la structure minimale d’un input
- l’intégration dans un `FormGroup`
- les interfaces `ControlValueAccessor` et `NG_VALUE_ACCESSOR`.

### L’objectif

Créer un **composant d’input réutilisable** compatible avec les Reactive Forms. Il pourra ensuite être utilisé dans un `FormGroup` comme n’importe quel champ natif.

Par exemple :

```html
<form [formGroup]="form">
  <app-star-rating formControlName="rating" />
</form>
```

### Le composant de base

Pour démarrer, nous allons créer une version simplifiée de notre composant : un affichage de 5 points cliquables. Ce n’est **pas encore un champ de formulaire**, mais cela pose les fondations de l’interaction.

Voici le code de base que nous allons utiliser comme point de départ :

```html
<!-- star-rating.component.html -->

<div 
  *ngFor="let dot of [].constructor(MAX_RATING); let i = index" 
  class="dot"
  [class.filled]="i < rating"
  (click)="rating = i + 1"
></div>
```

Note : la ligne `*ngFor="let dot of [].constructor(MAX_RATING); let i = index"` est une petite astuce permettant de faire une loop basée sur un nombre (MAX_RATING) plutôt qu’une liste, en créant un tableau vide pour la boucle.

```tsx
// star-rating.component.ts

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss'
})
export class StarRatingComponent {
  readonly MAX_RATING =  5;
  rating = 0;
}
```

```scss
// star-rating.component.scss

:host {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.dot {
  border-radius: 50%;
  height: 1rem;
  width: 1rem;
  border: 1px solid #707070;

  // On hover, color the dot and the previous dots
  &:not(.filled):has(~ .dot:hover), &:hover {
    background: rgba(255, 232, 0, 0.5);
  }

  // Bigger hover area
  &:after {
    cursor: pointer;
    content: '';
    display: block;
    width: 1.5rem;
    height: 1.5rem;
    translate: -5px -5px;
    border-radius: 50%;
  }

  // Change color when filled
  &.filled {
    background: rgb(255, 232, 0);
  }
}
```

Si vous interagissez avec le composant, vous verrez que l’interface réagit bien — les points se remplissent lorsque vous cliquez. **Mais cette information n’est pas communiquée au formulaire.**

Notre composant fonctionne, mais il n’est pas reconnu par Angular comme un champ de formulaire. Pour qu’Angular puisse récupérer et gérer sa valeur dans un `FormGroup`, on doit **implémenter l'interface** `ControlValueAccessor`. Cette interface permet à Angular de communiquer avec le composant comme il le ferait avec un `<input>` natif.

### Implémenter `ControlValueAccessor`

Pour implémenter cette interface, voici les **quatre fonctions** que l’on doit définir :

| Méthode | Rôle |
| --- | --- |
| `writeValue(value: any)` | Angular utilise cette méthode pour **passer une nouvelle valeur au composant**. |
| `registerOnChange(fn: any)` | Méthode qui définie la fonction que le composant doit appeler **quand sa valeur change**. |
| `registerOnTouched(fn: any)` | Méthode qui définie la fonction que le composant doit appeler **quand le champ est touché**. (focus / blur). |
| `setDisabledState?(isDisabled: boolean)` | Permet d’**activer ou désactiver** le champ depuis le formulaire. |

La bonne nouvelle, c’est que l’implémentation de ces méthodes est très simple, et se résume souvent au même code. Ajoutons ces méthodes à notre composant :

```tsx
// star-rating.component.ts

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss'
})
export class StarRatingComponent implements ControlValueAccessor {
  
  readonly MAX_RATING =  5;
  rating = 0;

  disabled = false;

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number): void {
    this.rating = value;
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled
  }
}
```

Sans oublier de mettre à jour l’HTML :

```html
<!-- star-rating.component.html -->

<div 
  *ngFor="let dot of [].constructor(MAX_RATING); let i = index" 
  class="dot"
  [class.filled]="i < rating"
  (click)="writeValue(i + 1)"
></div>

<!-- (click) utilise désormais writeValue() -->
```

En testant le composant dans un formulaire, on se rend compte qu’il n’est toujours pas bien reconnu par Angular. Aussi, une erreur apparaît dans la console :

> ⚠️ ERROR RuntimeError: NG01203: No value accessor for form control name: 'rating'. Find more at [https://angular.dev/errors/NG01203](https://angular.dev/errors/NG01203)

La raison est qu’il manque le provider `NG_VALUE_ACCESSOR` afin de spécifier l’implémentation de `ControlValueAccessor`. Il n’est pas nécessaire de connaître les détails de l’implémentation du provider, puisqu’elle est quasi-systématiquement la même pour tous les composants, mais vous pouvez en apprendre plus [ici](https://angular.dev/api/forms/NG_VALUE_ACCESSOR).

Voici le code à ajouter :

```tsx
// star-rating.component.ts

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StarRatingComponent),
      multi: true,
    },
  ],
})
export class StarRatingComponent implements ControlValueAccessor {
  // ...
}
```

Une fois le provider ajouté, la valeur du composant est bien récupérée dans le formulaire, et le composant est prêt à être utilisé !

```html
<!-- app.component.html -->

<div [formGroup]="form">
  <app-star-rating formControlName="rating" />
</div>

<div>
  <span>Rating formGroup : {{ form.get('rating')?.value }}</span>
</div>

<div>
  <app-star-rating [(ngModel)]="rating" />
</div>

<div>
  <span>Rating ngModel : {{ rating }}</span>
</div>
```

```tsx
// app.component.ts

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    StarRatingComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  
  form: FormGroup = new FormGroup({
    rating: new FormControl(0)
  });

  rating = 2; // on peut aussi initialiser la valeur du composant
}
```

```scss
// app.component.scss

:host {
  min-height: 100dvh;
  width: 100dvw;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
  justify-content: center; 
}
```

## La classe par défaut : `BasicInput`

Maintenant que vous savez implémenter un composant compatible `ControlValueAccessor`, vous avez sûrement remarqué que **beaucoup de code est redondant** :

- les setters `onChange`, `onTouched`
- le champ `disabled`
- la gestion de `writeValue()`

De plus, dans l’exemple précédent, notre composant `star-rating` ne prend pas en compte la valeur de `disabled` et ne change pas de style selon la validité du composant.

Toutes ces choses seront obligatoires pour chaque nouveau composant, mais il n’est pas nécessaire de réécrire le code à chaque fois. Plutôt que de copier-coller le code, nous allons créer une **classe de base abstraite** qui encapsule ce comportement.

### L’objectif

Créer une **classe abstraite réutilisable** qui servira de template à nos composants, et qui va fournir le code boilerplate à tous nos futurs inputs, à savoir :

- Implémenter `ControlValueAccessor`
- Gerer la synchronisation des données avec le `NgControl`
- Gerer le `disabled`, les états de validation, et les erreurs
- Initialiser une référence au `FormControl`

### Aperçu de `BasicInput`

```tsx
// basic-input.ts

@Component({
  template: '',
})
export abstract class BasicInput<T = any> implements ControlValueAccessor {
  //#region ------ PROPERTIES ------

  protected _data?: T
  protected disabled: boolean = false

  protected onChange: Function = (value: any) => {}
  protected onTouch: Function = (value: any) => {}

  //#endregion

  //#region ------ VALUE ACCESSOR ------

  writeValue(value: any): void {
    this.setData(value, false)
  }

  registerOnChange(fn: any): void {
    this.onChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled
  }
  
  setData(value: T | undefined, emitEvent: boolean): void {
    this._data = value
    if (emitEvent) {
      this.onChange(value)
      this.onTouch(value)
    }
  }

  //#endregion

  //#region ------ GETTERS & SETTERS ------

  get data(): T | undefined {
    return this._data
  }

  set data(value: T | undefined) {
    this.setData(value, true)
  }

  //#endregion
}
```

Cette classe reprend, dans les grandes lignes, l’implémentation de `ControlValueAccessor` réalisée dans la partie 1. Lorsqu'un composant hérite de `BasicInput`, toutes ces méthodes seront déjà implémentées et la valeur du champs sera accessible en interne grâce à la propriété `data`.

Un changement notable est que cet attribut a été implémenté via un getter et un setter, de manière à automatiquement appeler `onChange()` lorsque la valeur de `data` est changée dans le composant !

> ⚠️ Attention ! La méthode onChange ne doit être appelée que lorsque la valeur du champ a été changée **en interne**. La méthode `writeValue()` est utilisée lorsque la valeur est changée en externe (directement via le formGroup, par exemple). Elle ne doit donc pas appeler onChange.

### Validation et plus encore

Une classe template, c’est aussi l’occasion pour nous de rajouter des attributs pour se simplifier la vie lors de nos futurs développements. Ajoutons quelques attributs supplémentaires qui risquent de s’avérer utiles pour la suite :

```tsx
// basic-input.ts

@Component({
  template: '',
})
export abstract class BasicInput<T = any> implements ControlValueAccessor, OnInit {

  control?: FormControl<T>

  // [...]

  constructor(protected injector: Injector) {}

  ngOnInit() {
    this.initControl()
  }

  /**
   * Initializes the control for the basic input component.
   * Tries to inject the NgControl and assigns the appropriate control based on its type.
   * Depending on the type, the control can be a FormControl or an NgModel.
   * If the control is not found, it will be null.
   */
  protected initControl() {
    let injectedControl: NgControl | null = null

    try {
      injectedControl = this.injector.get(NgControl)
    } catch (e: any) {}

    if (!injectedControl) return

    switch (injectedControl.constructor) {
      case NgModel: {
        const { control } = injectedControl as NgModel
        this.control = control
        break
      }
      case FormControlName: {
        try {
          const formGroup = this.injector.get(FormGroupDirective)
          if (formGroup) this.control = formGroup.getControl(injectedControl as FormControlName)
        } catch (e: any) {
          let message =
            "Aucun formGroup n'a été trouvé pour le control " + injectedControl.name + '\n'
          message +=
            "Veuillez ajouter un formGroup au parent du composant ou utiliser l'attribut [formControl]"

          console.warn(message)

          this.control = null
        }
        break
      }
      default: {
        this.control = (injectedControl as FormControlDirective).form as FormControl
        break
      }
    }
  }

  // [...]

  /**
   * Determines if the value of the input component is valid.
   * Returns true if the control is null, untouched, or has no errors.
   * Returns false if the control has errors.
   */
  get validValue(): boolean {
    return (
      !this.control ||
      this.control.untouched ||
      !this.control?.errors ||
      Object.keys(this.control.errors).reduce((v) => !v, true)
    )
  }

  get required(): boolean {
    if (!this.control) return false
    return this.control.hasValidator(Validators.required)
  }
}

```

La principale nouveauté est l’obtention d’une référence au control injecté dans notre composant (soit par l’attribut `formControl`/`formControlName`, soit par l’attribute `ngModel`). Cette référence nous permet de déduire des informations sur l’état du formulaire. Dans le cas de notre classe `BasicInput`, j’ai décidé d'ajouter le getter `validValue` afin de pouvoir styliser nos futurs composants en cas d’erreur, et `required`, afin d’afficher, si nécessaire, une indication sur le label de nos champs, comme c’est souvent le cas.

Voici le code complet de la classe `BasicInput` :

```tsx
// basic-input.ts

@Component({
  template: '',
})
export abstract class BasicInput<T = any> implements ControlValueAccessor, OnInit {
  //#region ------ PROPERTIES ------

  control?: FormControl<T>

  protected _data?: T
  protected _disabled: boolean = false

  protected onChange: Function = (value: any) => {}
  protected onTouch: Function = (value: any) => {}

  //#endregion

  //#region ------ LIFE CYCLE ------

  constructor(protected injector: Injector) {}

  ngOnInit() {
    this.initControl()
  }

  /**
   * Initializes the control for the basic input component.
   * Tries to inject the NgControl and assigns the appropriate control based on its type.
   * Depending on the type, the control can be a FormControl or an NgModel.
   * If the control is not found, it will be null.
   */
  protected initControl() {
    let injectedControl: NgControl | null = null

    try {
      injectedControl = this.injector.get(NgControl)
    } catch (e: any) {}

    if (!injectedControl) return

    switch (injectedControl.constructor) {
      case NgModel: {
        const { control } = injectedControl as NgModel
        this.control = control
        break
      }
      case FormControlName: {
        try {
          const formGroup = this.injector.get(FormGroupDirective)
          if (formGroup) this.control = formGroup.getControl(injectedControl as FormControlName)
        } catch (e: any) {
          let message =
            "Aucun formGroup n'a été trouvé pour le control " + injectedControl.name + '\n'
          message +=
            "Veuillez ajouter un formGroup au parent du composant ou utiliser l'attribut [formControl]"

          console.warn(message)

          this.control = undefined
        }
        break
      }
      default: {
        this.control = (injectedControl as FormControlDirective).form as FormControl
        break
      }
    }
  }

  //#endregion

  //#region ------ VALUE ACCESSOR ------

  writeValue(value: any): void {
    this.setData(value, false)
  }

  registerOnChange(fn: any): void {
    this.onChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled
  }
  
  setData(value: T | undefined, emitEvent: boolean): void {
    this._data = value
    if (emitEvent) {
      this.onChange(value)
      this.onTouch(value)
    }
  }

  //#endregion

  //#region ------ GETTERS & SETTERS ------

  get data(): T | undefined {
    return this._data
  }

  set data(value: T | undefined) {
    this.setData(value, true)
  }

  get disabled(): boolean {
    return this._disabled
  }

  set disabled(value: boolean) {
    this._disabled = value
  }

  //#endregion

  //#region ------ SPECIAL GETTERS ------

  /**
   * Determines if the value of the input component is valid.
   * Returns true if the control is null, untouched, or has no errors.
   * Returns false if the control has errors.
   */
  get validValue(): boolean {
    return (
      !this.control ||
      this.control.untouched ||
      !this.control?.errors ||
      Object.keys(this.control.errors).reduce((v) => !v, true)
    )
  }

  get required(): boolean {
    if (!this.control) return false
    return this.control.hasValidator(Validators.required)
  }

  //#endregion
}
```

## Exemple 2 : Le composant `color-input`

Il est temps de passer une dernière fois en revue les sujets abordés durant cet article. Pour cette dernière partie, on va construire un **composant d’input complet**, afin de tirer parti de toutes les techniques abordées durant les parties précédentes.

### L’objectif

Créer un **composant d’input réutilisable** à l’aide de la classe `BasicInput`. Ce composant doit être compatible avec ReactiveForms et Forms et réagir correctement s’il est `disabled`, `required` ou en erreur.

### Le composant de base

Comme pour le premier exemple, nous allons partir d’un composant fonctionnel, mais qui n’implémente pas encore l’interface `ControlValueAccessor`. Voici le code de base :

```html
<!-- color-input.component.html -->

@if (label) {
  <span class="title">{{ label }}</span>
}
<label class="input-wrapper">
  <div class="color-preview" [style.backgroundColor]="'#'+ color"></div>
  <span class="hashtag">#</span>
  <input type="text" (blur)="onBlur()" [(ngModel)]="color" />
</label>
```

```tsx
// color-input.component.ts

@Component({
  selector: 'app-color-input',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './color-input.component.html',
  styleUrl: './color-input.component.scss'
})
export class ColorInputComponent {
  //#region ------ READ-ONLY ------

  readonly HEX_REGEX = /^([0-9A-F]{3}){1,2}$/i;

  //#endregion

  //#region ------ PROPERTIES ------

  @Input()
  label ?: string;

  _color: string = 'c0ffee';

  //#endregion

  //#region ------ LIFE CYCLE ------

  constructor() {}

  //#endregion

  //#region ------ METHODS ------

  onBlur() {
    if (this.color.length === 3) 
      this.color = this.color.replace(/([0-9A-F])/gi, '$1$1');
  }

  //#endregion

  //#region ------ GETTERS & SETTERS ------

  set color(value: string) {  
    if(!value.match(this.HEX_REGEX)) return;
    this._color = value;
  }

  get color(): string {
    return this._color;
  }

  //#endregion
}
```

```scss
// color-input.component.scss

.title {
  font-size: 0.875rem;
  color: #c0c0ce;
}

.input-wrapper {
  cursor: text;

  position: relative;

  display: flex;
  align-items: center;

  width: 6.5rem;

  border-radius: 4px;
  border: #ceceda solid 1px;
  outline: 2px solid #c0c0ce00;

  transition: border 0.2s ease-in-out, outline 0.2s ease-in-out;

  &:is(:hover, :focus, :focus-within) {
    border: #c0c0ce solid 1px;
    outline: 2px solid #c0c0ce80;
  }
}

.color-preview {
  width: 1rem;
  height: 1rem;

  margin: 0.5rem;
  margin-right: 0;

  border-radius: 2px;   
}

.hashtag, input {
  font-size: 14px;
  font-family: monospace;
}

.hashtag {
  color: #c0c0ce;
  padding-left: 0.5rem;
}

input {
  flex: 1 1 auto;
  width: 2rem;
  padding: 0.5rem;
  padding-left: 0;

  background: none;
  border: none;

  font-family: monospace;

  &:is(:hover, :focus, :focus-visible, :active) {
    outline: none;
  }
}
```

Le composant est fonctionnel, et sa valeur sera mise à jour à chaque fois qu'un code héxadécimal valide y sera entré, mais nous n'avons pas facilement accès à sa valeur. Utilisons la classe `BasicInput` pour régler ce problème.

### Implémenter `BasicInput`

Maintenant que le composant de base est prêt, nous allons le transformer à l'aide de la classe BasicInput. Cette approche va nous permettre de considérablement simplifier l'implémentation de notre composant (en comparaison avec l'exemple 1), tout en ajoutant les fonctionnalités nécessaires, et plus encore.

La première étape est de faire hériter notre composant de la classe `BasicInput`. Modifions le composant pour qu'il étende `BasicInput<string>` (puisque la valeur de notre champ sera une chaîne de caractères), et ajoutons le provider NG_VALUE_ACCESSOR :

```tsx
// color-input.component.ts

@Component({
  selector: 'app-color-input',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './color-input.component.html',
  styleUrl: './color-input.component.scss',
  providers: [
      {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => ColorInputComponent),
        multi: true,
      },
    ],
})
export class ColorInputComponent extends BasicInput<string> implements ControlValueAccessor, OnInit  {
  //#region ------ READ-ONLY ------

  readonly HEX_REGEX = /^([0-9A-F]{3}){1,2}$/i;

  //#endregion

  //#region ------ PROPERTIES ------

  @Input()
  label ?: string;

  //#endregion

  //#region ------ LIFE CYCLE ------

  override ngOnInit() {
    super.ngOnInit();

    if (this.control) {
      this.control.addValidators(this.hexValidator.bind(this));
    }
  }

  //#region ------ METHODS ------

  hexValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!this.HEX_REGEX.test(control.value)) {
      return { 'invalidHex': { value: control.value } };
    }
    return null;
  }

  onBlur() {
    if (this.data && this.data.length === 3) 
      this.data = this.data.replace(/([0-9A-F])/gi, '$1$1');
  }

  //#endregion
}
```

Avec `BasicInput`, la valeur du composant est gérée via la propriété `data`, nous avons donc supprimé toute notion de `color` dans le composant. La validation de l'hexadécimal est ajoutée sous forme d'un validateur personnalisé, qui sera automatiquement pris en compte par Angular, et exploité afin de styliser le composant.

Du côté du template, il faut également remplacer les occurrences de `color` par `data`, et ajouter des classes conditionnelles pour gérer les états `disabled` et `invalid` :

```html
<!-- color-input.component.html -->
@if (label) {
  <span class="title" [class.invalid]="!validValue">{{ label + (required ? ' *' : '') }}</span>
}
<label class="input-wrapper" [class.invalid]="!validValue">
  <div class="color-preview" [style.backgroundColor]="'#'+ data"></div>
  <span class="hashtag">#</span>
  <input type="text" (blur)="onBlur()" [(ngModel)]="data" [disabled]="disabled" />
</label>
```

La classe `invalid` est appliquée au label et au titre si la valeur du champ n'est pas valide. Le champ `input` est également désactivé si la propriété `disabled` est vraie. De plus, le label affiche une astérisque si le champ est requis.

Enfin, voici le style mis à jour pour gérer les nouveaux états :

```scss
// color-input.component.scss (extraits)

.title {
  // ...

  transition: color 0.2s ease-in-out;

  &.invalid {
    color: rgb(var(--error));
  }
}

.input-wrapper {
  // ...

  &:is(:hover, :focus, :focus-within):not(:has([disabled])) {
    border: #c0c0ce solid 1px;
    outline: 2px solid #c0c0ce80;

    &.invalid {
      border: rgb(var(--error)) solid 1px;
      outline: 2px solid rgba(var(--error), 0.5);
    }
  }

  &.invalid {
    border: rgb(var(--error)) solid 1px;
  }

  &:has([disabled]) {
    cursor: default;
    border: #ceceda dashed 1px;
  }
}
```

Avec ces quelques modifications, notre composant est désormais complet, il est :

- Compatible avec les ReactiveForms et Forms
- Capable de gérer les états `disabled` et `invalid`
- Capable d'afficher si le champ est `required`
- Visuellement réactif aux erreurs de validation

Le composant peut maintenant être utilisé comme n'importe quel input natif :

```html

<!-- Utilisation dans un formulaire -->
<form [formGroup]="form">
  <app-color-input 
    formControlName="color" 
    label="Color input"
  />
</form>

<!-- Ou avec ngModel -->
<app-color-input 
  [(ngModel)]="color" 
  label="Color input"
/>
```

## Pour conclure

Il est facile de créer des composants d'input personnalisés avec Angular, mais suivre les bonnes pratiques permet de s'assurer que ces composants sont robustes, réutilisables et compatibles avec l'écosystème Angular. De plus, même si cette approche peut sembler opaque lorsqu'on la découvre, c'est finalement une approche très structurée, qui facilite la maintenance et l'évolution des composants.

Voici un rapide résumé des points clés :

1. Le provider `NG_VALUE_ACCESSOR`.
Cette petite configuration est cruciale pour qu'Angular reconnaisse le composant comme un champ de formulaire.
C'est une étape toujours identique, mais nécessaire, et facile à oublier.

2. L'interface `ControlValueAccessor`.
Cette interface définit les méthodes que le composant doit implémenter pour interagir avec Angular.
Encore une fois, l'implémentation est souvent similaire d'un composant à l'autre, mas elle peut être encapsulée entièrement dans une classe de base.

3. La classe `BasicInput`.
Cette classe abstraite encapsule le code redondant et fournit une base solide pour nos futurs composants.
Elle maintient une cohérence à travers tous nos composants personnalisés.

### Et maintenant ?

N'hésitez pas à réutiliser et enrichir la classe `BasicInput` en fonction des besoins de vos futurs projets. Le code complet des exemples de cette article est disponible sur [Github](https://github.com/evanlaj/angular-examples), et vous pouvez observer le résultat final sur [StackBlitz](https://stackblitz.com/~/github.com/evanlaj/angular-examples).