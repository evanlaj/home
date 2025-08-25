---
title: "Angular : Comment faire un composant interactif comme les pros ?"
description: "Utilisez le plein potentiel des formulaires Angular avec l'interface <code>ControlValueAccessor</code>."
date: "30/04/2025"
---

## Introduction

> Afin de simplifier la lecture, tous les imports ont été volontairement omis dans les extraits de code.
Le code source de cet articleest disponible en son intégralité ici <= TODO.
> 

> ⚠️ Cet article nécessite d'être familier avec Angular. C'est une bonne idée de connaitre les notions de FormGroup, FormControl et l'attribut [(ngModel)] avant de lire la suite !
> 

Créer un champ de formulaire personnalisé peut s’avérer nécessaire dans de nombreuses situations ; que ce soit parce que le composant n'existe pas nativement, n'est pas dans votre bibliothèque de composant ou encore pour gagner plus de contrôle sur le comportement de votre application, il est très probable qu’un développeur Angular soit un jour confronté à ce problème.

Heureusement, Angular met a disposition deux API robustes pour gérer les formulaires : les **Forms** et les **ReactiveForms**. Dans cet article, nous allons voir ensemble comment créer un composant compatible avec l’écosysteme d’Angular, en respectant les conventions attendues par ces deux API.

En implémentant un input de cette manière on s’assure :

- Une syntaxe identique aux composants HTML natifs sur Angular
- La compatibilité avec les API de gestion de formulaires (Forms & ReactiveForms)
- La possibilité d’ajouter, au besoin, de la validation, des états (`disabled`, `touched`, `invalid`, etc.) et d'autres comportements liés aux formulaires
- Un composant réutilisable, prévisible et facile à maintenir

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
> 

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

Toutes ces choses seront obligatoire pour chaque nouveau composant, mais il n’est pas nécessaire de réécrire le code à chaque fois. Plutôt que de copier-coller le code, nous allons créer une **classe de base abstraite** qui encapsule ce comportement.

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

Cette classe reprend, dans les grandes lignes, l’implémentation de `ControlValueAccessor` réalisée dans la partie 1. Lorsque un composant hérite de `BasicInput`, toutes ces méthodes seront déjà implémenté et la valeur du champs sera accessible en interne grâce à la propriété `data`.

Un changement notable est que cet attribut a été implémenté via un getter et un setter, de manière a automatiquement appeler `onChange()` lorsque la valeur de `data` est changée dans le composant !

> ⚠️ Attention ! 
La méthode onChange ne doit être appelée que lorsque la valeur du champ a été changée **en interne**. La méthode `writeValue()` est utilisée lorsque la valeur est changée en externe (directement via le formGroup, par exemple). Elle ne doit donc pas appeler onChange.
> 

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

La principale nouveauté est l’obtention d’une référence au control injecté dans notre composant (soit par l’attribut `formControl`/`formControlName`, soit par l’attribute `ngModel`). Cette référence nous permet de déduire des informations sur l’état du formulaire. Dans le cas de notre classe `BasicInput`, j’ai décidé de rajouté le getter `validValue` afin de pouvoir styliser nos futurs composants en cas d’erreur, et `required`, afin d’afficher si nécessaire une indication sur le label de nos champs comme c’est souvent le cas.

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
  <div class="color-preview" [style.backgroundColor]="'#'+color"></div>
  <span class="hashtag">#</span>
  <input type="text" [(ngModel)]="color" />
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

  _color: string = 'ff0000';

  //#endregion

  //#region ------ LIFE CYCLE ------

  constructor() {}

  //#endregion

  //#region ------ GETTERS & SETTERS ------

  set color(value: string) {  
    if(!value.match(this.HEX_REGEX)) return;

    if (value.length === 4) 
      value = value.replace(/([0-9A-F])/gi, '$1$1');

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

  &:is(:focus, :focus-within) {
    & .overlay {
      pointer-events: all;
      opacity: 1;
      scale: 1;
    }
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