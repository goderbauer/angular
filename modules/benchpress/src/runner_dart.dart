import './runner.dart' as language_agnostic;
import 'package:angular2/di.dart' show bind;
import './common_options.dart' show Options;

/// Language-specific runner that adds language-specific bindings.
class Runner extends language_agnostic.Runner {
  Runner([List defaultBindings = null]) : super(Runner._addDartBindings(defaultBindings));
	
  static _addDartBindings(List defaultBindings) {
    if (defaultBindings == null) {
      defaultBindings = [];
    }
	  defaultBindings.add(bind(Options.WRITE_FILE).toValue(() {
	    print("TODO");
	  }));
	  return defaultBindings;
  }
}
