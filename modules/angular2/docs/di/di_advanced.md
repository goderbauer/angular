# Dependency Injection (DI): Documentation (Advanced Topics)

This document talks about advanced topics related to the DI module and how it is used in Angular. You don't have to know this to use DI in Angular or independently.

### Key

Most of the time we do not have to deal with keys.

```
var inj = Injector.resolveAndCreate([
  bind(Engine).toFactory(() => new TurboEngine())  //the passed in token Engine gets mapped to a key
]);
var engine = inj.get(Engine); //the passed in token Engine gets mapped to a key
```

Now, the same example, but with keys.

```
var ENGINE_KEY = Key.get(Engine);

var inj = Injector.resolveAndCreate([
  bind(ENGINE_KEY).toFactory(() => new TurboEngine()) // no mapping
]);
var engine = inj.get(ENGINE_KEY);  // no mapping
```

Every key has an id, which we utilize to store bindings and instances. So Injector uses keys internally for performance reasons.

### ProtoInjector and Injector

Often there is a need to create multiple instances of essentially the same injector. In Angular 2, for example, every component element type gets an injector configured in the same way.

Doing the following would be very inefficient.

```
function createComponetInjector(parent, bindings:Binding[]) {
	return parentresolveAndCreateChild(bindings);
}
```

This would require us to resolve and store bindings for every single component instance. Instead, we want to resolve and store the bindings for every component type, and create a set of instances for every component. To enable that DI separates the meta information about injectables (Bindings and their dependencies), which are stored in `ProtoInjector`, and injectables themselves, which are stored in `Injector`.

```
var proto = new ProtoInjector(bindings); // done once
function createComponentInjector(parent, proto) {
  return new Injector(proto, parent);
}
```

`Injector.resolveAndCreate` creates both a `ProtoInjector` and an `Injector`.

### Host & Visibility

An injector can have a parent. The parent relationship can be marked as a "host" as follows:

```
var child = new Injector(proto, parent, true /* host */);
```

Hosts are used to constraint dependency resolution. For instance, in the following example, DI will stop looking for `Engine` after reaching the host.

```
class Car {
  constructor(@Host() e: Engine) {}
}
```

Imagine the following scenario:

```
    ParentInjector
       /   \
	    /     \ host
   Child1    Child2
```

Here both Child1 and Child2 are children of ParentInjector. Child2 marks this relationship as host. ParentInjector might want to expose two different sets of bindings for its "regular" children and its "host" children. Bindings visible to "regular" children are called PUBLIC, and bindings visible to "host" children are called PRIVATE. This is an advanced use case used by Angular, where components can provide different sets of bindings for their children and their view.

Let's look at this example.

```
class Car {
  constructor(@Host() e: Engine) {}
}
var resolvedBindings = Injector.resolve([Car, Engine]);

var parentProto = new ProtoInjector([
  new BindingWithVisibility(Engine, PUBLIC),
  new BindingWithVisibility(Car, PUBLIC)
]);
var parent = new Injector(parentProto);

var hostChildProto = new ProtoInjector([new BindingWithVisibility(Car, PUBLIC)]);
var hostChild = new Injector(hostChildProto, parent, true);

var regularChildProto = new ProtoInjector([new BindingWithVisibility(Car, PUBLIC)]);
var regularChild = new Injector(regularChildProto, parent, false);

hostChild.get(Car); // will throw because PUBLIC dependencies declared at the host cannot be seen by child injectors
parent.get(Car); // this works
regularChild.get(Car); // this works
```

Now, let's mark Engine as PRIVATE.

```
class Car {
  constructor(@Host() e: Engine) {}
}

var resolvedBindings = Injector.resolve([Car, Engine]);
var parentProto = new ProtoInjector([
  new BindingWithVisibility(Engine, PRIVATE),
	new BindingWithVisibility(Car, PUBLIC)
]);
var parent = new Injector(parentProto);

var hostChildProto = new ProtoInjector([new BindingWithVisibility(Car, PUBLIC)]);
var hostChild = new Injector(hostChildProto, parent, true);

var regularChildProto = new ProtoInjector([new BindingWithVisibility(Car, PUBLIC)]);
var regularChild = new Injector(regularChildProto, parent, false);

hostChild.get(Car); // this works
parent.get(Car); // this throws
regularChild.get(Car); // this throws
```

Now, let's mark Engine as both PUBLIC and PRIVATE.

```
class Car {
  constructor(@Host() e: Engine) {}
}

var resolvedBindings = Injector.resolve([Car, Engine]);
var parentProto = new ProtoInjector([
  new BindingWithVisibility(Engine, PUBLIC_AND_PRIVATE),
	new BindingWithVisibility(Car, PUBLIC)
]);
var parent = new Injector(parentProto);

var hostChildProto = new ProtoInjector([new BindingWithVisibility(Car, PUBLIC)]);
var hostChild = new Injector(hostChildProto, parent, true);

var regularChildProto = new ProtoInjector([new BindingWithVisibility(Car, PUBLIC)]);
var regularChild = new Injector(regularChildProto, parent, false);

hostChild.get(Car); // this works
parent.get(Car); // this works
regularChild.get(Car); // this works
```

## Angular 2 and DI

Now let's see how Angular 2 uses DI behind the scenes.

The right mental model is to think that every DOM element has an Injector. (In practice, only interesting elements containing directives will have an injector, but this is a performance optimization)

There are two properties that can be used to configure DI: bindings and viewBindings.

- `bindings` affects the element and its children.
- `viewBindings` affects the component's view.

Every directive can declare injectables via `bindings`, but only components can declare `viewBindings`.

Let's look at a complex example that shows how the injector tree gets created.

```
<my-component my-directive>
	<needs-service></needs-service>
</my-component>
```

Both MyComponent and MyDirective are created on the same element.

```
@Component({
  selector: 'my-component,
	bindings: [
	  bind("componentService").toValue("Host_MyComponentService")
	],
	viewBindings: [
		bind("viewService").toValue("View_MyComponentService")
	]
})
@View({
  template: `<needs-view-service></needs-view-service>`,
  directives: [NeedsViewService]
})
class MyComponent {}

@Directive({
  selector: '[my-directive]',
  bindings: [
    bind("directiveService").toValue("MyDirectiveService")
  ]
})
class MyDirective {
}
```

NeedsService and NeedsViewService look like this:

```
@Directive({
  selector: 'needs-view-service'
})
class NeedsViewService {
  constructor(@Host() @Inject('viewService') viewService) {}
}

@Directive({
  selector: 'needs-service'
})
class NeedsService {
  constructor(@Host() @Inject('componentService') service1,
              @Host() @Inject('directiveService') service2) {}
}
```

This will create the following injector tree.

```
		  Injector1 [
			  {binding: MyComponent,        visibility: PUBLIC_AND_PRIVATE},
				{binding: "componentService", visibility: PUBLIC_AND_PRIVATE},
				{binding: "viewService",      visibility: PRIVATE},
			  {binding: MyDirective         visibility: PUBLIC},
				{binding: "directiveService", visibility: PUBLIC}
			]
  /                                                       \
  |                                                        \ host
Injector2 [                                           Injector3 [
  {binding: NeedsService, visibility: PUBLIC}           {binding: NeedsViewService, visibility: PUBLIC}
]                                                     ]
```

As you can see the component and its bindings can be seen by its children and its view. The view bindings can be seen only by the view. And the bindings of other directives can be seen only their children.

