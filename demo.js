(function(JSCN){
  var Class,
      instance;
  Class=JSCN();
  Class('MaClasse');
  instance=new MaClasse();
  console.log(instance);
  console.log(instance.abc);
  console.log(instance instanceof MaClasse);
  console.log(instance instanceof ClasseMere);
  console.log(instance.test());
  console.log(ClasseMere.test());
  console.log(MaClasse.test());
  instance.abc=3;
  console.log(instance.abc);
  console.log(instance.getParentInstance());
  /*
  // uncomment to try with an abstract class (throws an error at line 409)
  Class('MaClasseEtendantUneAbstraite');
  instance=new MaClasseEtendantUneAbstraite();
  console.log(instance.getParentInstance() instanceof ClasseMereAbstraite);
  */
})(JSCN);
