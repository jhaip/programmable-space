class Room:
    update_func = None

    def init(self, update_func):
        self.update_func = update_func

        while True:
            self.update_func()

    def claim(self, claim_str):
        print("TODO claim: {}".format(claim_str))

