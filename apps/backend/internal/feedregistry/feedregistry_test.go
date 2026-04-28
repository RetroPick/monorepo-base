package feedregistry

import "testing"

func TestLoad(t *testing.T) {
	f, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if f.ChainID != 84532 {
		t.Fatalf("chainId: %d", f.ChainID)
	}
	if len(f.Feeds) < 1 {
		t.Fatalf("expected feeds")
	}
}

func TestFilterOracleClass(t *testing.T) {
	oc := 0
	f, err := Filter("base-sepolia", &oc)
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range f.Feeds {
		if e.OracleClass != 0 {
			t.Fatalf("oracleClass: %d", e.OracleClass)
		}
	}
}
