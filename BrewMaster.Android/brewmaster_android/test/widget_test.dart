import 'package:brewmaster_android/main.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('asks for the local BrewMaster server on first start', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const BrewMasterApp());
    await tester.pumpAndSettle();

    expect(find.text('Conecte-se ao BrewMaster'), findsOneWidget);
    expect(find.text('http://192.168.1.10:5180'), findsOneWidget);
    expect(find.text('Conectar ao BrewMaster'), findsOneWidget);
  });
}
